import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  glassButtonClass,
  SectionHeader,
} from "../admin/ui";

const STATUS_STYLES = {
  ok: {
    label: "In Sync",
    badge: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40",
    accent: "bg-emerald-500/25",
  },
  warning: {
    label: "Needs Review",
    badge: "bg-amber-400/20 text-amber-100 border border-amber-300/40",
    accent: "bg-amber-400/25",
  },
  error: {
    label: "Critical",
    badge: "bg-rose-500/25 text-rose-100 border border-rose-400/40",
    accent: "bg-rose-500/25",
  },
};

const defaultStatus = {
  label: "In Sync",
  badge: "bg-white/10 text-white border border-white/20",
  accent: "bg-indigo-500/20",
};

const formatDate = (value) => {
  if (!value) return "—";
  return dayjs(value).format("MMM D, YYYY h:mm A");
};

const TransparencyDashboard = () => {
  const { apiBaseUrl, fileEndpoint } = useConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialSerial = searchParams.get("serial") || "";

  const [serialInput, setSerialInput] = useState(initialSerial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchTransparency = useCallback(
    async (serialNumber, { showSpinner = true } = {}) => {
      const trimmed = serialNumber?.trim();
      if (!trimmed) {
        setError("Enter a serial number to continue.");
        setResult(null);
        return;
      }

      if (showSpinner) {
        setLoading(true);
      }
      setError("");

      try {
        const resp = await fetch(
          `${apiBaseUrl}/transparency/${encodeURIComponent(trimmed)}`
        );
        const body = await resp.json().catch(() => null);

        if (!resp.ok) {
          throw new Error(body?.message || "Failed to load transparency data");
        }
        if (!body?.success) {
          throw new Error(body?.message || "Unable to load transparency data");
        }

        setResult(body);
        setLastRefreshed(new Date());
      } catch (err) {
        const message = err?.message || "Unexpected error fetching data.";
        setError(message);
        setResult(null);
        toast.error(message);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    setSerialInput(initialSerial);
    if (initialSerial) {
      fetchTransparency(initialSerial);
    }
  }, [initialSerial, fetchTransparency]);

  const onChainTimeline = useMemo(() => {
    if (!result?.onChainEvents) return [];
    return result.onChainEvents.map((evt) => {
      const payload = evt.payload || {};
      const tsIso = evt.timestampIso || evt.emittedAt;
      return {
        id: evt.id,
        title: evt.eventName,
        actor: payload.actor,
        location: payload.location,
        isSold: payload.isSold,
        timestamp: tsIso ? formatDate(tsIso) : "—",
        block: evt.blockNumber ?? "—",
        txHash: evt.txHash,
      };
    });
  }, [result]);

  const ownershipTimeline = useMemo(() => {
    if (!result?.ownershipHistory) return [];
    return result.ownershipHistory
      .map((entry) => ({
        id: entry.id,
        ownerName: entry.owner_name,
        ownerIdentifier: entry.owner_identifier,
        acquiredAt: entry.acquired_at ? formatDate(entry.acquired_at) : "—",
        transferredAt: entry.transferred_at
          ? formatDate(entry.transferred_at)
          : null,
      }))
      .reverse();
  }, [result]);

  const reconciliation = result?.reconciliation || null;
  const statusKey = reconciliation?.status || "ok";
  const statusTokens = STATUS_STYLES[statusKey] || defaultStatus;
  const openIssues = reconciliation?.issues?.length || 0;

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmed = serialInput.trim();
    setSearchParams(trimmed ? { serial: trimmed } : {});
    await fetchTransparency(trimmed);
  };

  const handleReset = () => {
    setSerialInput("");
    setResult(null);
    setError("");
    setSearchParams({});
  };

  const handleRefresh = async () => {
    const targetSerial = result?.serialNumber || serialInput.trim();
    if (!targetSerial) {
      toast.error("Nothing to refresh yet. Search for a serial first.");
      return;
    }
    await fetchTransparency(targetSerial, { showSpinner: false });
  };

  const handleDownloadCsv = () => {
    if (!result?.serialNumber) return;
    const url = `${apiBaseUrl}/chain-events?serialNumber=${encodeURIComponent(
      result.serialNumber
    )}&format=csv`;
    window.open(url, "_blank", "noopener");
  };

  const metaSummary = useMemo(() => {
    return [
      {
        label: "Serial",
        value: result?.serialNumber || "Awaiting lookup",
        key: "serial",
      },
      {
        label: "Status",
        value: statusTokens.label,
        key: "status",
      },
      {
        label: "On-chain events",
        value: onChainTimeline.length.toLocaleString(),
        key: "events",
      },
      {
        label: "Owners",
        value: ownershipTimeline.length.toLocaleString(),
        key: "owners",
      },
      {
        label: "Updated",
        value: lastRefreshed
          ? dayjs(lastRefreshed).format("h:mm A")
          : "Pending",
        key: "updated",
      },
    ];
  }, [
    lastRefreshed,
    onChainTimeline.length,
    ownershipTimeline.length,
    result?.serialNumber,
    statusTokens.label,
  ]);

  const summaryCards = useMemo(() => {
    return [
      {
        key: "events",
        label: "On-chain events",
        value: onChainTimeline.length.toLocaleString(),
        helper: "Captured by the blockchain indexer",
        accent: "bg-indigo-500/25",
      },
      {
        key: "owners",
        label: "Ownership records",
        value: ownershipTimeline.length.toLocaleString(),
        helper: "Off-chain custody changes",
        accent: "bg-sky-500/25",
      },
      {
        key: "issues",
        label: "Recon issues",
        value: openIssues.toLocaleString(),
        helper: "Mismatches needing review",
        accent: statusTokens.accent,
      },
      {
        key: "refreshed",
        label: "Last refreshed",
        value: lastRefreshed ? formatDate(lastRefreshed) : "—",
        helper: "Local browser time",
        accent: "bg-purple-500/25",
      },
    ];
  }, [lastRefreshed, onChainTimeline.length, openIssues, ownershipTimeline.length, statusTokens.accent]);

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={handleRefresh} className={glassButtonClass}>
        ⟳
        <span>Refresh data</span>
      </button>
      {result?.serialNumber ? (
        <button
          type="button"
          onClick={handleDownloadCsv}
          className={glassButtonClass}
        >
          ⬇
          <span>Download CSV</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className={`${glassButtonClass} hidden sm:inline-flex`}
      >
        ←
        <span>Back</span>
      </button>
    </div>
  );

  const toolbar = (
    <GlassCard className="w-full" padding="p-5">
      <form
        onSubmit={handleSearch}
        className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end"
      >
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
            Serial number
          </span>
          <input
            type="text"
            value={serialInput}
            onChange={(event) => setSerialInput(event.target.value)}
            placeholder="Enter or paste serial"
            className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white/80 transition focus:border-white/40 focus:outline-none focus:ring-0"
          />
        </label>
        <button
          type="submit"
          className={`${glassButtonClass} justify-center md:justify-start`}
          disabled={loading}
        >
          {loading ? "Loading" : "View timeline"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={`${glassButtonClass} justify-center md:justify-start`}
        >
          Reset
        </button>
      </form>
    </GlassCard>
  );

  return (
    <AdminShell
      title="Transparency Intelligence"
      subtitle="Fuse blockchain provenance with off-chain custody to reconcile every serial in real time."
      meta={metaSummary}
      actions={headerActions}
      toolbar={toolbar}
    >
      <div className="mx-auto flex w-full max-w-[1450px] flex-col gap-10">
        {error ? (
          <GlassCard className="border border-rose-500/40 bg-rose-500/10 text-rose-50">
            <p className="text-sm font-medium">{error}</p>
          </GlassCard>
        ) : null}

        {!result && !loading ? (
          <GlassCard className="flex flex-col items-start gap-4 p-8">
            <h2 className="text-2xl font-semibold text-white">
              Search for a serial to begin
            </h2>
            <p className="max-w-xl text-sm text-white/70">
              Enter any product serial to instantly blend on-chain smart contract
              events with off-chain ownership records, identify reconciliation
              gaps, and download the full ledger for auditing.
            </p>
          </GlassCard>
        ) : null}

        {loading && !result ? (
          <GlassCard className="p-10 text-center text-white/60">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <p className="mt-4 text-sm uppercase tracking-[0.35em]">
              Fetching transparency intelligence
            </p>
          </GlassCard>
        ) : null}

        {result ? (
          <>
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <GlassCard key={card.key} className="relative overflow-hidden p-6">
                  <span
                    className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-3xl ${card.accent}`}
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
                    {card.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {card.value}
                  </p>
                  <p className="mt-3 text-sm text-white/60">{card.helper}</p>
                </GlassCard>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <GlassCard className="relative overflow-hidden p-7">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
                      Serial Overview
                    </p>
                    <h2 className="text-3xl font-semibold text-white">
                      {result.serialNumber}
                    </h2>
                    {result.product ? (
                      <div className="space-y-1 text-sm text-white/70">
                        <div>
                          <span className="text-white/50">Product:</span> {" "}
                          {result.product.name || "—"}
                        </div>
                        <div>
                          <span className="text-white/50">Brand:</span> {" "}
                          {result.product.brand || "—"}
                        </div>
                        {result.product.description ? (
                          <div className="text-white/60">
                            {result.product.description}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${statusTokens.badge}`}
                    >
                      {statusTokens.label}
                    </span>
                    {result.product?.image ? (
                      <img
                        src={fileEndpoint("product", result.product.image)}
                        alt={result.product.name || result.serialNumber}
                        className="h-28 w-28 rounded-2xl border border-white/15 object-cover shadow-lg"
                      />
                    ) : null}
                  </div>
                </div>
                {openIssues ? (
                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-200/80">
                      Reconciliation issues
                    </p>
                    <ul className="space-y-1 text-sm text-white/70">
                      {reconciliation?.issues?.map((issue, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1 text-rose-300">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </GlassCard>

              <GlassCard className="space-y-4 p-7">
                <SectionHeader
                  title="Ledger quick facts"
                  subtitle="Snapshot of this serial across networks"
                />
                <div className="space-y-3 text-sm text-white/70">
                  <div className="flex items-center justify-between">
                    <span>First seen on-chain</span>
                    <span className="font-medium text-white">
                      {result.firstSeenOnChain ? formatDate(result.firstSeenOnChain) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Most recent activity</span>
                    <span className="font-medium text-white">
                      {result.lastActivityAt ? formatDate(result.lastActivityAt) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Current owner</span>
                    <span className="font-medium text-white">
                      {ownershipTimeline[0]?.ownerName || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Unique custodians</span>
                    <span className="font-medium text-white">
                      {new Set(
                        ownershipTimeline
                          .map((item) => item.ownerIdentifier)
                          .filter(Boolean)
                      ).size.toLocaleString()}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <GlassCard className="space-y-5 p-7">
                <SectionHeader
                  title="On-chain event timeline"
                  subtitle="Smart contract emissions captured for this serial"
                />
                {onChainTimeline.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-white/50">
                    <span className="text-3xl">🛰️</span>
                    <span className="text-sm">No blockchain events recorded yet.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {onChainTimeline.map((item) => (
                      <div
                        key={`${item.id}-${item.txHash}`}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-base font-semibold text-white">
                            {item.title}
                          </span>
                          <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                            Block {item.block}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-white/60">
                          {item.actor ? <div>Actor: {item.actor}</div> : null}
                          {item.location ? <div>Location: {item.location}</div> : null}
                          <div>Timestamp: {item.timestamp}</div>
                          {typeof item.isSold === "boolean" ? (
                            <div>Sold flag: {item.isSold ? "true" : "false"}</div>
                          ) : null}
                          {item.txHash ? (
                            <div className="break-all text-white/40">{item.txHash}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              <GlassCard className="space-y-5 p-7">
                <SectionHeader
                  title="Off-chain ownership history"
                  subtitle="Custody records from brand & channel partners"
                />
                {ownershipTimeline.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-white/50">
                    <span className="text-3xl">🧾</span>
                    <span className="text-sm">No ownership records available.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ownershipTimeline.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
                      >
                        <div className="text-base font-semibold text-white">
                          {item.ownerName}
                        </div>
                        {item.ownerIdentifier ? (
                          <div className="text-xs uppercase tracking-[0.3em] text-white/50">
                            {item.ownerIdentifier}
                          </div>
                        ) : null}
                        <div className="mt-2 space-y-1 text-xs text-white/60">
                          <div>Acquired: {item.acquiredAt}</div>
                          {item.transferredAt ? (
                            <div>Transferred: {item.transferredAt}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </section>

            {reconciliation?.combinedTimeline?.length ? (
              <GlassCard className="space-y-5 p-7">
                <SectionHeader
                  title="Unified reconciliation timeline"
                  subtitle="Merged view blending blockchain and off-chain events"
                />
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/70">
                    <thead className="text-xs uppercase tracking-[0.3em] text-white/40">
                      <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Label</th>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {reconciliation.combinedTimeline.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-white/60">
                            {row.type.replace(/-/g, " ")}
                          </td>
                          <td className="px-4 py-3 text-white">{row.label}</td>
                          <td className="px-4 py-3">
                            {row.timestampIso ? formatDate(row.timestampIso) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {row.type.startsWith("on-chain") ? (
                              <div className="space-y-1 text-xs text-white/60">
                                {row.payload?.actor ? <div>Actor: {row.payload.actor}</div> : null}
                                {row.payload?.location ? (
                                  <div>Location: {row.payload.location}</div>
                                ) : null}
                                {typeof row.payload?.isSold === "boolean" ? (
                                  <div>
                                    Sold flag: {row.payload.isSold ? "true" : "false"}
                                  </div>
                                ) : null}
                                {row.txHash ? (
                                  <div className="break-all text-white/40">{row.txHash}</div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="space-y-1 text-xs text-white/60">
                                {row.ownerName ? <div>Owner: {row.ownerName}</div> : null}
                                {row.ownerIdentifier ? (
                                  <div>Identifier: {row.ownerIdentifier}</div>
                                ) : null}
                                {row.acquiredAt ? <div>Acquired: {row.acquiredAt}</div> : null}
                                {row.transferredAt ? (
                                  <div>Transferred: {row.transferredAt}</div>
                                ) : null}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            ) : null}
          </>
        ) : null}
      </div>
    </AdminShell>
  );
};

export default TransparencyDashboard;
