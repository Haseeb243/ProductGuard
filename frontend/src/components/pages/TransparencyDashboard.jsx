import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import bgImg from "../../img/bg 4.png";
import { useConfig } from "../../context/ConfigContext";

const statusStyles = {
  ok: {
    badge: "bg-emerald-400/90 text-emerald-950",
    card: "border-emerald-400/40",
  },
  warning: {
    badge: "bg-amber-300/90 text-amber-900",
    card: "border-amber-300/40",
  },
  error: {
    badge: "bg-rose-400/90 text-rose-950",
    card: "border-rose-400/40",
  },
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

  useEffect(() => {
    if (initialSerial) {
      fetchTransparency(initialSerial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSerial]);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    const previousBodyStyles = {
      backgroundColor: body.style.backgroundColor,
      color: body.style.color,
      backgroundImage: body.style.backgroundImage,
    };
    const previousHtmlStyles = {
      backgroundColor: html.style.backgroundColor,
      backgroundImage: html.style.backgroundImage,
    };

    body.style.backgroundColor = "#040815";
    body.style.color = "#e2e8f0";
    body.style.backgroundImage = "";
    html.style.backgroundColor = "#040815";
    html.style.backgroundImage = "";

    return () => {
      body.style.backgroundColor = previousBodyStyles.backgroundColor;
      body.style.color = previousBodyStyles.color;
      body.style.backgroundImage = previousBodyStyles.backgroundImage;
      html.style.backgroundColor = previousHtmlStyles.backgroundColor;
      html.style.backgroundImage = previousHtmlStyles.backgroundImage;
    };
  }, []);

  const fetchTransparency = async (serialNumber) => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(
        `${apiBaseUrl}/transparency/${encodeURIComponent(serialNumber)}`
      );
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(body?.message || "Failed to load transparency data");
      }
      const body = await resp.json();
      if (!body?.success) {
        throw new Error(body?.message || "Unable to load transparency data");
      }
      setResult(body);
    } catch (err) {
      setError(err.message || "Unexpected error fetching transparency data.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = serialInput.trim();
    if (!trimmed) {
      setError("Enter a serial number to continue.");
      setResult(null);
      return;
    }
    setSearchParams(trimmed ? { serial: trimmed } : {});
    fetchTransparency(trimmed);
  };

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
        timestamp: tsIso ? dayjs(tsIso).format("MMM D, YYYY h:mm A") : "—",
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
        acquiredAt: entry.acquired_at
          ? dayjs(entry.acquired_at).format("MMM D, YYYY h:mm A")
          : "—",
        transferredAt: entry.transferred_at
          ? dayjs(entry.transferred_at).format("MMM D, YYYY h:mm A")
          : null,
      }))
      .reverse();
  }, [result]);

  const reconciliation = result?.reconciliation;
  const statusKey = reconciliation?.status || "ok";
  const statusStyle = statusStyles[statusKey] || statusStyles.ok;

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat text-slate-100"
      style={{
        backgroundColor: "#040815",
        backgroundImage: `linear-gradient(rgba(8,12,30,0.96),rgba(4,10,24,0.94)), url(${bgImg})`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 drop-shadow-[0_2px_12px_rgba(15,118,110,0.35)]">
              Transparency Dashboard
            </h1>
            <p className="text-sm md:text-base text-slate-300 mt-2">
              Merge on-chain provenance with off-chain ownership for any serial
              number.
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-slate-600/70 text-slate-200 hover:bg-slate-800/60 transition"
            type="button"
          >
            Back
          </button>
        </div>

        <form
          onSubmit={handleSearch}
          className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-3 shadow-xl backdrop-blur"
        >
          <input
            type="text"
            className="flex-1 px-4 py-3 rounded-lg bg-slate-950/60 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400/70 focus:border-primary-400/60"
            placeholder="Enter product serial number"
            value={serialInput}
            onChange={(e) => setSerialInput(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              className="px-6 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold transition shadow-md"
              type="submit"
              disabled={loading}
            >
              {loading ? "Loading..." : "View Timeline"}
            </button>
            {result?.serialNumber && (
              <a
                href={`${apiBaseUrl}/chain-events?serialNumber=${encodeURIComponent(
                  result.serialNumber
                )}&format=csv`}
                className="px-6 py-3 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800/60 transition no-underline text-center shadow-md"
              >
                Download CSV
              </a>
            )}
          </div>
        </form>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-rose-500/90 text-rose-50 shadow-lg">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div
              className={`border ${statusStyle.card} bg-slate-900/75 rounded-2xl p-6 backdrop-blur shadow-xl`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-300 mb-1">Serial</div>
                  <div className="text-2xl font-semibold text-slate-50">
                    {result.serialNumber}
                  </div>
                  {result.product && (
                    <div className="mt-3 text-slate-200 space-y-1">
                      <div>
                        <span className="text-slate-400">Product:</span>{" "}
                        {result.product.name || "—"}
                      </div>
                      <div>
                        <span className="text-slate-400">Brand:</span>{" "}
                        {result.product.brand || "—"}
                      </div>
                      {result.product.description && (
                        <div className="text-sm text-slate-300">
                          {result.product.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs uppercase ${statusStyle.badge}`}
                  >
                    {statusKey === "ok" ? "In Sync" : "Attention"}
                  </span>
                </div>
              </div>
              {result.product?.image && (
                <div className="mt-4">
                  <img
                    src={fileEndpoint("product", result.product.image)}
                    alt={result.product.name || result.serialNumber}
                    className="w-32 h-32 rounded-xl object-cover border border-slate-700/70 shadow-lg"
                  />
                </div>
              )}
              {reconciliation?.issues && (
                <ul className="mt-4 space-y-2 text-sm text-slate-200 list-disc list-inside">
                  {reconciliation.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-slate-900/75 border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-slate-50 mb-4">
                  On-chain Event Timeline
                </h2>
                {onChainTimeline.length === 0 ? (
                  <p className="text-slate-300 text-sm">
                    No blockchain events recorded yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {onChainTimeline.map((item) => (
                      <div
                        key={`${item.id}-${item.txHash}`}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 shadow-md"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-slate-100 font-medium">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-400">
                            Block {item.block}
                          </div>
                        </div>
                        <div className="text-sm text-slate-200 mt-2 space-y-1">
                          {item.actor && <div>Actor: {item.actor}</div>}
                          {item.location && (
                            <div>Location: {item.location}</div>
                          )}
                          <div>Timestamp: {item.timestamp}</div>
                          {typeof item.isSold === "boolean" && (
                            <div>
                              Sold flag: {item.isSold ? "true" : "false"}
                            </div>
                          )}
                          <div className="text-xs break-all text-slate-400/70">
                            {item.txHash}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-slate-900/75 border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-slate-50 mb-4">
                  Off-chain Ownership History
                </h2>
                {ownershipTimeline.length === 0 ? (
                  <p className="text-slate-300 text-sm">
                    No ownership records available.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ownershipTimeline.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 shadow-md"
                      >
                        <div className="text-slate-100 font-medium">
                          {item.ownerName}
                        </div>
                        {item.ownerIdentifier && (
                          <div className="text-xs text-slate-400 uppercase tracking-wide">
                            Identifier: {item.ownerIdentifier}
                          </div>
                        )}
                        <div className="text-sm text-slate-200 mt-2 space-y-1">
                          <div>Acquired: {item.acquiredAt}</div>
                          {item.transferredAt && (
                            <div>Transferred: {item.transferredAt}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {reconciliation?.combinedTimeline?.length ? (
              <section className="bg-slate-900/75 border border-slate-700/60 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-slate-50 mb-4">
                  Unified Timeline
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left text-slate-200">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Label</th>
                        <th className="px-4 py-2">Timestamp</th>
                        <th className="px-4 py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliation.combinedTimeline.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-slate-800/70 hover:bg-slate-800/60 transition"
                        >
                          <td className="px-4 py-3 text-slate-300">
                            {row.type.replace(/-/g, " ")}
                          </td>
                          <td className="px-4 py-3 text-slate-100">
                            {row.label}
                          </td>
                          <td className="px-4 py-3">
                            {row.timestampIso
                              ? dayjs(row.timestampIso).format(
                                  "MMM D, YYYY h:mm A"
                                )
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {row.type.startsWith("on-chain") ? (
                              <div className="space-y-1 text-xs text-slate-300">
                                {row.payload?.actor && (
                                  <div>Actor: {row.payload.actor}</div>
                                )}
                                {row.payload?.location && (
                                  <div>Location: {row.payload.location}</div>
                                )}
                                {typeof row.payload?.isSold === "boolean" && (
                                  <div>
                                    Sold flag:{" "}
                                    {row.payload.isSold ? "true" : "false"}
                                  </div>
                                )}
                                {row.txHash && (
                                  <div className="break-all text-slate-400/70">
                                    {row.txHash}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1 text-xs text-slate-300">
                                {row.ownerName && (
                                  <div>Owner: {row.ownerName}</div>
                                )}
                                {row.ownerIdentifier && (
                                  <div>Identifier: {row.ownerIdentifier}</div>
                                )}
                                {row.acquiredAt && (
                                  <div>Acquired: {row.acquiredAt}</div>
                                )}
                                {row.transferredAt && (
                                  <div>Transferred: {row.transferredAt}</div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransparencyDashboard;
