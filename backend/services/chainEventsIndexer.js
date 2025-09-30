const { ethers } = require("ethers");
const contractArtifact = require("../abis/Identeefi.json");

const DEFAULT_RPC_URL =
  process.env.CHAIN_INDEXER_RPC_URL ||
  process.env.RPC_URL ||
  "http://127.0.0.1:8545";

const INDEXER_ENABLED =
  (process.env.CHAIN_INDEXER_ENABLED || "true").toLowerCase() !== "false";

const BLOCK_CHUNK = parseInt(
  process.env.CHAIN_INDEXER_BLOCK_CHUNK || "2000",
  10
);
const BACKFILL_INTERVAL_MS = parseInt(
  process.env.CHAIN_INDEXER_BACKFILL_MS || String(5 * 60 * 1000),
  10
);
const RETRY_INTERVAL_MS = parseInt(
  process.env.CHAIN_INDEXER_RETRY_MS || String(30 * 1000),
  10
);

const ABI = contractArtifact.abi;

function toISODate(timestampSec) {
  if (typeof timestampSec !== "number" || Number.isNaN(timestampSec)) {
    return null;
  }
  try {
    return new Date(timestampSec * 1000).toISOString();
  } catch (e) {
    return null;
  }
}

async function ensureChainEventsSchema(pgClient) {
  await pgClient.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'chain_events'
          AND column_name = 'block_number'
      ) THEN
        ALTER TABLE public.chain_events ADD COLUMN block_number bigint;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'chain_events'
          AND column_name = 'log_index'
      ) THEN
        ALTER TABLE public.chain_events ADD COLUMN log_index integer;
      END IF;

      ALTER TABLE public.chain_events
        ALTER COLUMN log_index SET DEFAULT (-1);

      UPDATE public.chain_events SET log_index = -1 WHERE log_index IS NULL;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'chain_events'
          AND column_name = 'event_signature'
      ) THEN
        ALTER TABLE public.chain_events ADD COLUMN event_signature text;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'chain_events'
          AND column_name = 'emitted_at'
      ) THEN
        ALTER TABLE public.chain_events ADD COLUMN emitted_at timestamp with time zone;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_chain_events_serial_block'
      ) THEN
        CREATE INDEX idx_chain_events_serial_block
          ON public.chain_events (serial_number, block_number, log_index);
      END IF;

      IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_chain_events_tx_hash'
      ) THEN
        EXECUTE 'DROP INDEX IF EXISTS public.idx_chain_events_tx_hash';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_chain_events_tx_log'
      ) THEN
        CREATE UNIQUE INDEX uq_chain_events_tx_log
          ON public.chain_events (tx_hash, log_index);
      END IF;
    END $$;
  `);
}

function normalizeTimestamp(raw) {
  if (raw == null) return { raw: null, unix: null };
  let unix = null;
  if (typeof raw === "number") {
    unix = raw;
  } else if (typeof raw === "string") {
    const parsed = Number(raw);
    unix = Number.isFinite(parsed) ? parsed : null;
  } else if (raw._isBigNumber || raw._hex) {
    try {
      const value = ethers.BigNumber.from(raw).toNumber();
      unix = value;
    } catch (e) {
      unix = null;
    }
  }
  return { raw: raw != null ? String(raw) : null, unix };
}

function buildPayload(eventName, args) {
  if (eventName === "ProductRegistered") {
    const [serialNumber, name, brand, actor, location, timestampRaw] = args;
    const ts = normalizeTimestamp(timestampRaw);
    return {
      serialNumber,
      name,
      brand,
      actor,
      location,
      timestamp: ts.raw,
      timestampUnix: ts.unix,
      isSold: false,
      source: "on-chain",
    };
  }
  if (eventName === "ProductHistoryAdded") {
    const [serialNumber, actor, location, timestampRaw, isSold] = args;
    const ts = normalizeTimestamp(timestampRaw);
    return {
      serialNumber,
      actor,
      location,
      timestamp: ts.raw,
      timestampUnix: ts.unix,
      isSold: Boolean(isSold),
      source: "on-chain",
    };
  }

  return { args: Array.from(args) };
}

function extractSerialParts(value) {
  if (value == null) {
    return { serial: null, hash: null };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return {
      serial: trimmed.length ? trimmed : null,
      hash: null,
    };
  }

  if (typeof value === "object") {
    if (typeof value.serialNumber === "string") {
      const trimmed = value.serialNumber.trim();
      return {
        serial: trimmed.length ? trimmed : null,
        hash: typeof value.hash === "string" ? value.hash : null,
      };
    }
    if (typeof value.hash === "string") {
      return {
        serial: null,
        hash: value.hash,
      };
    }
  }

  return { serial: null, hash: null };
}

async function decodeTransactionArgs({
  event,
  provider,
  contractInterface,
  txDecodeCache,
  logger,
}) {
  if (!event?.transactionHash || !provider || !contractInterface) {
    return null;
  }

  const cacheKey = event.transactionHash.toLowerCase();
  if (txDecodeCache?.has(cacheKey)) {
    return txDecodeCache.get(cacheKey);
  }

  try {
    const tx = await provider.getTransaction(event.transactionHash);
    if (!tx) {
      txDecodeCache?.set(cacheKey, null);
      return null;
    }

    const parsed = contractInterface.parseTransaction({
      data: tx.data,
      value: tx.value,
    });

    if (txDecodeCache) {
      txDecodeCache.set(cacheKey, parsed);
      if (txDecodeCache.size > 1000) {
        txDecodeCache.clear();
      }
    }

    return parsed;
  } catch (err) {
    if (txDecodeCache) {
      txDecodeCache.set(cacheKey, null);
      if (txDecodeCache.size > 1000) {
        txDecodeCache.clear();
      }
    }
    logger?.warn?.(
      `[chain-indexer] Failed to decode tx ${event.transactionHash}: ${err.message}`
    );
    return null;
  }
}

async function resolveSerialNumber({
  event,
  payload,
  provider,
  contractInterface,
  txDecodeCache,
  logger,
}) {
  const fromPayload = extractSerialParts(payload?.serialNumber);
  if (fromPayload.serial) {
    return fromPayload;
  }

  const eventArgCandidate =
    event?.args?.serialNumber !== undefined
      ? event.args.serialNumber
      : event?.args?.[0];
  const fromEvent = extractSerialParts(eventArgCandidate);
  if (fromEvent.serial) {
    return fromEvent;
  }

  const fallbackHash =
    fromEvent.hash ||
    fromPayload.hash ||
    (typeof payload?.serialHash === "string" ? payload.serialHash : null);

  const parsed = await decodeTransactionArgs({
    event,
    provider,
    contractInterface,
    txDecodeCache,
    logger,
  });

  const argCandidates = parsed?.args
    ? [
        parsed.args.serialNumber,
        parsed.args._serialNumber,
        parsed.args.serial,
        parsed.args[0],
        parsed.args[1],
        parsed.args[2],
      ]
    : [];

  for (const candidate of argCandidates) {
    const parts = extractSerialParts(candidate);
    if (parts.serial) {
      return {
        serial: parts.serial,
        hash: fallbackHash || parts.hash || null,
      };
    }
  }

  return {
    serial: fallbackHash || null,
    hash: fallbackHash || null,
  };
}

async function upsertChainEvent(pgClient, eventData) {
  const {
    serialNumber,
    eventName,
    txHash,
    payload,
    blockNumber,
    logIndex,
    eventSignature,
    emittedAt,
  } = eventData;

  await pgClient.query(
    `
      INSERT INTO public.chain_events
        (serial_number, event_name, tx_hash, payload, block_number, log_index, event_signature, emitted_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
      ON CONFLICT (tx_hash, log_index) DO UPDATE
        SET payload = EXCLUDED.payload,
            serial_number = EXCLUDED.serial_number,
            event_name = EXCLUDED.event_name,
            block_number = EXCLUDED.block_number,
            event_signature = EXCLUDED.event_signature,
            emitted_at = COALESCE(EXCLUDED.emitted_at, public.chain_events.emitted_at)
    `,
    [
      serialNumber,
      eventName,
      txHash,
      JSON.stringify(payload),
      blockNumber != null ? Number(blockNumber) : null,
      logIndex != null ? Number(logIndex) : -1,
      eventSignature || null,
      emittedAt || null,
    ]
  );
}

async function persistEvent({
  provider,
  pgClient,
  eventName,
  event,
  logger,
  contractInterface,
  txDecodeCache,
}) {
  const payload = buildPayload(eventName, event.args || []);

  const { serial: resolvedSerial, hash: serialHash } =
    await resolveSerialNumber({
      event,
      payload,
      provider,
      contractInterface,
      txDecodeCache,
      logger,
    });

  const serialNumber = resolvedSerial || serialHash;
  if (!serialNumber) {
    logger?.warn?.(
      `[chain-indexer] Skipping ${eventName} without resolvable serial number`
    );
    return;
  }

  if (serialHash) {
    payload.serialHash = serialHash;
  }
  payload.serialNumber = serialNumber;

  let emittedAt = null;
  if (event.blockNumber != null) {
    try {
      const block = await provider.getBlock(event.blockNumber);
      emittedAt = block?.timestamp ? toISODate(block.timestamp) : null;
    } catch (e) {
      logger?.warn?.(
        `[chain-indexer] Failed to fetch block timestamp for #${event.blockNumber}: ${e.message}`
      );
    }
  }

  await upsertChainEvent(pgClient, {
    serialNumber,
    eventName,
    txHash: event.transactionHash,
    payload,
    blockNumber: event.blockNumber,
    logIndex: event.logIndex,
    eventSignature: event.eventSignature || event.event,
    emittedAt,
  });
}

async function getLatestIndexedBlock(pgClient) {
  const res = await pgClient.query(
    `SELECT MAX(block_number) AS max_block FROM public.chain_events`
  );
  const raw = res.rows?.[0]?.max_block;
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function syncHistorical({
  provider,
  contract,
  contractInterface,
  txDecodeCache,
  pgClient,
  logger,
  fromBlock,
}) {
  const latest = await provider.getBlockNumber();
  if (fromBlock == null || Number.isNaN(fromBlock)) {
    fromBlock = 0;
  }
  if (fromBlock > latest) {
    return { latestProcessed: latest };
  }

  let processedLatest = fromBlock - 1;

  const filters = [
    { name: "ProductRegistered", filter: contract.filters.ProductRegistered() },
    {
      name: "ProductHistoryAdded",
      filter: contract.filters.ProductHistoryAdded(),
    },
  ];

  for (let start = fromBlock; start <= latest; start += BLOCK_CHUNK) {
    const end = Math.min(start + BLOCK_CHUNK - 1, latest);
    for (const { name, filter } of filters) {
      try {
        const events = await contract.queryFilter(filter, start, end);
        for (const event of events) {
          await persistEvent({
            provider,
            pgClient,
            eventName: name,
            event,
            logger,
            contractInterface,
            txDecodeCache,
          });
          if (typeof event.blockNumber === "number") {
            processedLatest = Math.max(processedLatest, event.blockNumber);
          }
        }
      } catch (err) {
        logger?.error?.(
          `[chain-indexer] Failed to fetch ${name} events between blocks ${start}-${end}: ${err.message}`
        );
      }
    }
  }

  return { latestProcessed: Math.max(processedLatest, latest) };
}

async function startChainEventsIndexer({ pgClient, logger = console }) {
  const state = {
    enabled: INDEXER_ENABLED,
    status: INDEXER_ENABLED ? "initializing" : "disabled",
    rpcUrl: DEFAULT_RPC_URL,
    contractAddress: process.env.CONTRACT_ADDRESS || null,
    lastError: null,
    lastIndexedBlock: null,
    lastHistoricalSyncAt: null,
    lastLiveEventAt: null,
    lastBackfillAt: null,
    lastBackfillErrorAt: null,
    listenerReadyAt: null,
    retries: 0,
    retryInMs: null,
    chainId: null,
    networkName: null,
    updatedAt: new Date().toISOString(),
  };

  let provider = null;
  let contract = null;
  let liveHandlers = [];
  let backfillTimer = null;
  let retryTimer = null;
  let latestProcessed = null;
  let stopped = false;
  const txDecodeCache = new Map();

  const updateState = (patch = {}) => {
    Object.assign(state, patch, { updatedAt: new Date().toISOString() });
  };

  const cleanup = () => {
    liveHandlers.forEach(({ eventName, handler }) => {
      try {
        contract?.off?.(eventName, handler);
      } catch (err) {
        logger?.warn?.(
          `[chain-indexer] Failed to detach live handler ${eventName}: ${err.message}`
        );
      }
    });
    liveHandlers = [];
    if (backfillTimer) {
      clearInterval(backfillTimer);
      backfillTimer = null;
    }
    txDecodeCache.clear();
    provider = null;
    contract = null;
  };

  const updateLatestProcessed = (blockNumber, extra = {}) => {
    if (typeof blockNumber !== "number" || Number.isNaN(blockNumber)) {
      return;
    }
    if (latestProcessed == null || blockNumber > latestProcessed) {
      latestProcessed = blockNumber;
    }
    updateState({ lastIndexedBlock: latestProcessed, ...extra });
  };

  const scheduleRetry = (delayMs = RETRY_INTERVAL_MS) => {
    if (stopped) return;
    const safeDelay = Math.max(delayMs, 5000);
    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    updateState({ status: "waiting-retry", retryInMs: safeDelay });
    retryTimer = setTimeout(() => {
      if (stopped) return;
      updateState({ retries: state.retries + 1, status: "initializing" });
      boot().catch((err) => {
        logger.error(`[chain-indexer] Retry bootstrap failed: ${err.message}`);
        updateState({ status: "error", lastError: err.message });
        scheduleRetry(Math.min(safeDelay * 2, RETRY_INTERVAL_MS * 5));
      });
    }, safeDelay);
  };

  const controller = {
    stop: () => {
      stopped = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      cleanup();
    },
    getStatus: () => ({
      ...state,
      ready: state.status === "ready",
    }),
  };

  if (!INDEXER_ENABLED) {
    logger.info("[chain-indexer] Disabled via CHAIN_INDEXER_ENABLED flag");
    updateState({ status: "disabled" });
    return controller;
  }

  if (!state.contractAddress) {
    const message = "CONTRACT_ADDRESS is not set; skipping blockchain indexer";
    logger.warn(`[chain-indexer] ${message}`);
    updateState({ status: "error", lastError: message });
    return controller;
  }

  async function boot() {
    if (stopped) return null;
    cleanup();
    updateState({ status: "connecting", lastError: null, retryInMs: null });

    let network;
    try {
      provider = new ethers.providers.JsonRpcProvider(state.rpcUrl);
      network = await provider.getNetwork();
      updateState({
        chainId: network?.chainId || null,
        networkName: network?.name || null,
      });
    } catch (err) {
      logger.error(
        `[chain-indexer] Failed to initialize provider at ${state.rpcUrl}: ${err.message}`
      );
      updateState({ status: "error", lastError: err.message });
      scheduleRetry();
      return null;
    }

    try {
      contract = new ethers.Contract(state.contractAddress, ABI, provider);
    } catch (err) {
      logger.error(
        `[chain-indexer] Failed to instantiate contract at ${state.contractAddress}: ${err.message}`
      );
      updateState({ status: "error", lastError: err.message });
      scheduleRetry();
      return null;
    }

    try {
      await ensureChainEventsSchema(pgClient);
    } catch (err) {
      logger.error(
        `[chain-indexer] Failed to ensure chain_events schema: ${err.message}`
      );
      updateState({ status: "error", lastError: err.message });
      scheduleRetry();
      return null;
    }

    let lastIndexed = null;
    try {
      lastIndexed = await getLatestIndexedBlock(pgClient);
      updateState({ lastIndexedBlock: lastIndexed });
      latestProcessed = lastIndexed != null ? lastIndexed : null;
    } catch (err) {
      logger.error(
        `[chain-indexer] Failed to read latest indexed block: ${err.message}`
      );
      updateState({ status: "error", lastError: err.message });
      scheduleRetry();
      return null;
    }

    const configuredStart = parseInt(
      process.env.CHAIN_INDEXER_START_BLOCK || "0",
      10
    );
    const startFrom =
      lastIndexed != null
        ? lastIndexed + 1
        : Number.isFinite(configuredStart)
        ? Math.max(configuredStart, 0)
        : 0;

    updateState({ status: "syncing", syncStartBlock: startFrom });

    logger.info(
      `[chain-indexer] Starting historical sync from block ${startFrom} (last indexed: ${
        lastIndexed ?? "none"
      })`
    );

    try {
      const { latestProcessed: processed } = await syncHistorical({
        provider,
        contract,
        contractInterface: contract.interface,
        txDecodeCache,
        pgClient,
        logger,
        fromBlock: startFrom,
      });
      if (typeof processed === "number") {
        updateLatestProcessed(processed, {
          lastHistoricalSyncAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      logger.error(`[chain-indexer] Historical sync failed: ${err.message}`);
      updateState({ status: "error", lastError: err.message });
      scheduleRetry();
      return null;
    }

    const liveHandlersLocal = [];

    const registerLiveHandler = (eventName, handler) => {
      contract.on(eventName, handler);
      liveHandlersLocal.push({ eventName, handler });
    };

    registerLiveHandler(
      "ProductRegistered",
      async (serialNumber, name, brand, actor, location, timestamp, event) => {
        try {
          await persistEvent({
            provider,
            pgClient,
            eventName: "ProductRegistered",
            event,
            logger,
            contractInterface: contract.interface,
            txDecodeCache,
          });
          updateLatestProcessed(event?.blockNumber ?? latestProcessed, {
            lastLiveEventAt: new Date().toISOString(),
          });
        } catch (err) {
          logger.error(
            `[chain-indexer] Failed to persist live ProductRegistered: ${err.message}`
          );
          updateState({ lastError: err.message });
        }
      }
    );

    registerLiveHandler(
      "ProductHistoryAdded",
      async (serialNumber, actor, location, timestamp, isSold, event) => {
        try {
          await persistEvent({
            provider,
            pgClient,
            eventName: "ProductHistoryAdded",
            event,
            logger,
            contractInterface: contract.interface,
            txDecodeCache,
          });
          updateLatestProcessed(event?.blockNumber ?? latestProcessed, {
            lastLiveEventAt: new Date().toISOString(),
          });
        } catch (err) {
          logger.error(
            `[chain-indexer] Failed to persist live ProductHistoryAdded: ${err.message}`
          );
          updateState({ lastError: err.message });
        }
      }
    );

    liveHandlers = liveHandlersLocal;
    updateState({
      status: "ready",
      lastError: null,
      listenerReadyAt: new Date().toISOString(),
    });
    logger.info("[chain-indexer] Listener ready for live events");

    if (backfillTimer) {
      clearInterval(backfillTimer);
      backfillTimer = null;
    }
    if (BACKFILL_INTERVAL_MS > 0) {
      backfillTimer = setInterval(async () => {
        if (stopped) return;
        const resumeFrom = (latestProcessed || 0) + 1;
        try {
          const { latestProcessed: processed } = await syncHistorical({
            provider,
            contract,
            contractInterface: contract.interface,
            txDecodeCache,
            pgClient,
            logger,
            fromBlock: resumeFrom,
          });
          if (typeof processed === "number") {
            updateLatestProcessed(processed, {
              lastBackfillAt: new Date().toISOString(),
            });
          } else {
            updateState({ lastBackfillAt: new Date().toISOString() });
          }
        } catch (err) {
          logger.warn(
            `[chain-indexer] Periodic backfill failed from block ${resumeFrom}: ${err.message}`
          );
          updateState({
            lastError: err.message,
            lastBackfillErrorAt: new Date().toISOString(),
          });
        }
      }, BACKFILL_INTERVAL_MS);
    }

    return controller;
  }

  await boot();

  if (!stopped) {
    process.once("SIGINT", controller.stop);
    process.once("SIGTERM", controller.stop);
  }

  return controller;
}

async function fetchChainEvents(
  pgClient,
  { serialNumber, limit = 100, offset = 0, eventName }
) {
  const clauses = [];
  const values = [];

  if (serialNumber) {
    values.push(serialNumber);
    clauses.push(`serial_number = $${values.length}`);
  }

  if (eventName) {
    values.push(eventName);
    clauses.push(`event_name = $${values.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limitSafe = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const offsetSafe = Math.max(parseInt(offset, 10) || 0, 0);

  const query = `
    SELECT id, serial_number, event_name, tx_hash, payload, block_number, log_index, event_signature, emitted_at, created_at
    FROM public.chain_events
    ${whereClause}
    ORDER BY block_number DESC NULLS LAST, log_index DESC NULLS LAST, id DESC
    LIMIT ${limitSafe} OFFSET ${offsetSafe}
  `;

  const { rows } = await pgClient.query(query, values);
  return rows;
}

module.exports = {
  ensureChainEventsSchema,
  startChainEventsIndexer,
  fetchChainEvents,
};
