import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  SectionHeader,
  Divider,
  glassButtonClass,
} from "../admin/ui";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";

const formatNumber = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return "0";
  if (Math.abs(number) >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(number) >= 1_000) {
    return `${(number / 1_000).toFixed(1)}K`;
  }
  return number.toLocaleString();
};

const formatPercent = (part, total, digits = 1) => {
  const numerator = Number(part || 0);
  const denominator = Number(total || 0);
  if (!denominator || Number.isNaN(numerator) || Number.isNaN(denominator)) {
    return "0%";
  }
  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
};

const shortenAddress = (address = "") => {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

const formatLocation = (location) => {
  if (!location) return "Unknown";
  return location.replace(/;/g, ", ").replace(/\s+/g, " ").trim();
};

const deriveActivityTone = (action = "") => {
  const normalized = action.toLowerCase();
  if (normalized.includes("add") || normalized.includes("create")) {
    return {
      badge: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
      icon: "+",
    };
  }
  if (normalized.includes("update") || normalized.includes("edit")) {
    return {
      badge: "bg-sky-500/15 text-sky-100 border border-sky-400/30",
      icon: "✎",
    };
  }
  if (normalized.includes("delete") || normalized.includes("remove")) {
    return {
      badge: "bg-rose-500/15 text-rose-200 border border-rose-400/30",
      icon: "−",
    };
  }
  return {
    badge: "bg-white/10 text-white/70 border border-white/20",
    icon: "•",
  };
};

const Supplier = () => {
  const { apiBaseUrl } = useConfig();
  const {
    auth,
    logout,
    sidebarLinks,
    walletAddress,
    connectWallet,
    disconnectWallet,
    checkingWallet,
    isSupplier,
  } = useSupplierWorkspace();
  const navigate = useNavigate();

  const [scanMetrics, setScanMetrics] = useState({
    totalAllTime: 0,
    uniqueAllTime: 0,
    totalRecent: 0,
    uniqueRecent: 0,
    authenticRecent: 0,
    suspiciousRecent: 0,
    lastScanAt: null,
    recentScans: [],
    topLocations: [],
  });
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const handleScrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(`supplier-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const openChatWidget = useCallback(() => {
    const chatFab = document.querySelector('button[aria-label="Open chat"]');
    if (chatFab) {
      chatFab.click();
    } else {
      toast.error(
        "Chat widget is unavailable. Refresh the page to reload it."
      );
    }
  }, []);

  const loadDashboard = useCallback(
    async ({ showSpinner = true } = {}) => {
      if (!auth?.user) return;
      if (showSpinner) {
        setLoading(true);
      }
      setError(null);

      try {
        const scanParams = new URLSearchParams({
          username: auth.user,
          days: "30",
          limit: "20",
          locationLimit: "5",
        });
        const activityParams = new URLSearchParams({
          username: auth.user,
          limit: "20",
        });

        const [scansRes, activityRes] = await Promise.all([
          fetch(
            `${apiBaseUrl}/supplier/scans-summary?${scanParams.toString()}`
          ),
          fetch(`${apiBaseUrl}/activity-logs?${activityParams.toString()}`),
        ]);

        const scansJson = await scansRes.json().catch(() => null);
        if (!scansRes.ok || !scansJson?.success) {
          throw new Error(
            scansJson?.message || "Unable to load scan summary"
          );
        }

        const activityJson = await activityRes.json().catch(() => null);
        if (!activityRes.ok) {
          throw new Error("Unable to load activity log");
        }

        setScanMetrics({
          totalAllTime: scansJson.totalAllTime || 0,
          uniqueAllTime: scansJson.uniqueAllTime || 0,
          totalRecent: scansJson.totalRecent || 0,
          uniqueRecent: scansJson.uniqueRecent || 0,
          authenticRecent: scansJson.authenticRecent || 0,
          suspiciousRecent: scansJson.suspiciousRecent || 0,
          lastScanAt: scansJson.lastScanAt || null,
          recentScans: Array.isArray(scansJson.recentScans)
            ? scansJson.recentScans
            : [],
          topLocations: Array.isArray(scansJson.topLocations)
            ? scansJson.topLocations
            : [],
        });

        setActivityData(Array.isArray(activityJson) ? activityJson : []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Supplier dashboard load failed", err);
        const message = err?.message || "Unable to load supplier dashboard";
        setError(message);
        toast.error(message);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [apiBaseUrl, auth?.user]
  );

  useEffect(() => {
    if (auth?.user) {
      loadDashboard();
    }
  }, [auth?.user, loadDashboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard({ showSpinner: false });
  }, [loadDashboard]);

  const currentAccount = walletAddress;

  const totalScans30d = useMemo(
    () => Number(scanMetrics.totalRecent || 0),
    [scanMetrics.totalRecent]
  );
  const uniqueSerials30d = useMemo(
    () => Number(scanMetrics.uniqueRecent || 0),
    [scanMetrics.uniqueRecent]
  );
  const totalScansAllTime = useMemo(
    () => Number(scanMetrics.totalAllTime || 0),
    [scanMetrics.totalAllTime]
  );
  const authenticScans = useMemo(
    () => Number(scanMetrics.authenticRecent || 0),
    [scanMetrics.authenticRecent]
  );
  const suspiciousScans = useMemo(
    () => Number(scanMetrics.suspiciousRecent || 0),
    [scanMetrics.suspiciousRecent]
  );
  const lastScanAt = useMemo(
    () => scanMetrics.lastScanAt || null,
    [scanMetrics.lastScanAt]
  );
  const topLocations = useMemo(
    () => scanMetrics.topLocations || [],
    [scanMetrics.topLocations]
  );
  const recentScans = useMemo(
    () => scanMetrics.recentScans || [],
    [scanMetrics.recentScans]
  );

  const authenticRate = useMemo(
    () => formatPercent(authenticScans, totalScans30d),
    [authenticScans, totalScans30d]
  );
  const suspiciousRate = useMemo(
    () => formatPercent(suspiciousScans, totalScans30d),
    [suspiciousScans, totalScans30d]
  );
  const averageDailyScans = useMemo(() => {
    if (!totalScans30d) return "0";
    const average = totalScans30d / 30;
    return average >= 1 ? average.toFixed(0) : average.toFixed(1);
  }, [totalScans30d]);

  const recentActivity = useMemo(
    () => activityData.slice(0, 6),
    [activityData]
  );

  const metaSummary = useMemo(
    () => [
      {
        label: "Wallet",
        value: shortenAddress(currentAccount),
        key: "wallet",
      },
      {
        label: "Scans (30d)",
        value: formatNumber(totalScans30d),
        key: "scans30d",
      },
      {
        label: "Suspicious (30d)",
        value: formatNumber(suspiciousScans),
        key: "suspicious",
      },
      {
        label: "Last scan",
        value: formatDateTime(lastScanAt),
        key: "last-scan",
      },
    ],
    [currentAccount, totalScans30d, suspiciousScans, lastScanAt]
  );

  const quickLinksToolbar = (
    <GlassCard className="w-full" padding="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/profile" className={glassButtonClass}>
          Manage profile
        </Link>
        <Link to="/supplier/scanner" className={glassButtonClass}>
          Launch scanner
        </Link>
        <Link to="/update-product" className={glassButtonClass}>
          Update product
        </Link>
        <Link to="/update-product-details" className={glassButtonClass}>
          Update details
        </Link>
        <Link to="/transparency" className={glassButtonClass}>
          Transparency
        </Link>
        <Link to="/supplier/wallet" className={glassButtonClass}>
          Wallet
        </Link>
        <Link to="/supplier/chat" className={glassButtonClass}>
          Contact support
        </Link>
      </div>
    </GlassCard>
  );

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Link to="/update-product" className={glassButtonClass}>
        Update product
      </Link>
      <button
        type="button"
        onClick={connectWallet}
        className={`${glassButtonClass} ${
          checkingWallet ? "cursor-wait opacity-70" : ""
        }`}
        disabled={checkingWallet}
      >
        {checkingWallet
          ? "Connecting…"
          : currentAccount
          ? "Switch wallet"
          : "Connect wallet"}
      </button>
      <button
        type="button"
        onClick={handleRefresh}
        className={`${glassButtonClass} ${
          refreshing ? "cursor-wait opacity-70" : ""
        }`}
        disabled={refreshing}
      >
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className={`${glassButtonClass} border-rose-400/40 bg-rose-500/10 hover:border-rose-300/60 hover:bg-rose-500/20`}
      >
        Sign out
      </button>
    </div>
  );

  return (
    <AdminShell
      title="Supplier Logistics Deck"
      subtitle="Monitor verification scans, accelerate product updates, and keep fulfillment teams aligned."
      meta={metaSummary}
      actions={headerActions}
      toolbar={quickLinksToolbar}
      sidebarTitle="Supplier"
      sidebarLinks={sidebarLinks}
  forceSidebar={isSupplier}
      workspaceLabel="Supplier Hub"
      showHeaderNotifications={false}
    >
      {error ? (
        <GlassCard className="mx-auto max-w-2xl space-y-4 p-10 text-center text-white">
          <h2 className="text-2xl font-semibold">Dashboard unavailable</h2>
          <p className="text-white/70">{error}</p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRefresh}
              className={`${glassButtonClass} px-6`}
            >
              Retry
            </button>
          </div>
        </GlassCard>
      ) : loading ? (
        <div className="flex h-72 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10">
          <section id="supplier-overview">
            <GradientBorderCard className="relative overflow-hidden p-8">
              <span className="pointer-events-none absolute -left-20 top-10 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
              <span className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                    Fulfillment integrity
                  </p>
                  <h2 className="text-3xl font-semibold text-white">
                    Keep every shipment verified from dock to doorstep
                  </h2>
                  <p className="text-sm text-white/70">
                    Your dashboard unifies scan telemetry, update activity, and
                    transparency tooling so you can respond to anomalies before
                    they bottleneck the supply chain. Coordinate with
                    manufacturers, update product metadata, and share chain-of-
                    custody proof in a single workspace.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                    <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
                      Last refresh {formatDateTime(lastUpdated)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleScrollToSection("update")}
                      className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:border-white/30 hover:text-white"
                    >
                      Update a product →
                    </button>
                  </div>
                </div>
                <GlassCard className="w-full max-w-sm space-y-3 border border-white/15 bg-black/40 p-6 text-sm text-white/70 shadow-xl">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
                    <span>Authenticity rate</span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-emerald-100">
                      {authenticRate}
                    </span>
                  </div>
                  <Divider className="my-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                        Authentic
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {formatNumber(authenticScans)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                        Suspicious
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-rose-200">
                        {formatNumber(suspiciousScans)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Suspicion rate {suspiciousRate}
                  </p>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Avg daily scans {averageDailyScans}
                  </p>
                </GlassCard>
              </div>
            </GradientBorderCard>
          </section>

          <section
            id="supplier-stats"
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
          >
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Total scans (30d)
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(totalScans30d)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Verification events processed over the last month.
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Unique serials (30d)
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(uniqueSerials30d)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Distinct products your team has verified recently.
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                All-time scans
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(totalScansAllTime)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Lifetime authenticity checks completed by this supplier node.
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Last scan
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatDateTime(lastScanAt)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Timestamp of the most recent verification event.
              </p>
            </GlassCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <GlassCard className="p-7" id="supplier-profile">
              <SectionHeader
                eyebrow="Team identity"
                title="Profile & trust signals"
                description="Keep your supplier profile current so downstream partners recognize your shipments instantly."
              />
              <Divider className="my-6" />
              <div className="grid gap-4 text-sm text-white/70 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Username
                  </p>
                  <p className="mt-1 text-base text-white">
                    {auth?.user || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Role
                  </p>
                  <p className="mt-1 text-base text-white">
                    {auth?.role || "supplier"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Email
                  </p>
                  <p className="mt-1 break-all text-base text-white">
                    {auth?.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    2FA status
                  </p>
                  <p className="mt-1 text-base text-white">
                    {auth?.is2FAEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/profile" className={glassButtonClass}>
                  Edit profile
                </Link>
                <Link to="/2fa-settings" className={glassButtonClass}>
                  Configure 2FA
                </Link>
              </div>
            </GlassCard>
            <GlassCard className="p-7" id="supplier-wallet">
              <SectionHeader
                eyebrow="Wallet link"
                title="MetaMask connection"
                description="Connect a wallet to register updates on-chain and sync provenance records with manufacturers."
              />
              <Divider className="my-6" />
              <div className="space-y-3 text-sm text-white/70">
                <p>
                  Status:
                  <span className="ml-2 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em]">
                    {currentAccount ? "Connected" : "Disconnected"}
                  </span>
                </p>
                <p>
                  Current account:
                  <span className="ml-2 font-semibold text-white">
                    {shortenAddress(currentAccount)}
                  </span>
                </p>
                <p>
                  Match this wallet inside the Update Product console so on-chain traces line up with your supplier identity.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={connectWallet}
                  className={`${glassButtonClass} ${
                    checkingWallet ? "cursor-wait opacity-70" : ""
                  }`}
                  disabled={checkingWallet}
                >
                  {checkingWallet
                    ? "Connecting…"
                    : currentAccount
                    ? "Switch wallet"
                    : "Connect wallet"}
                </button>
                {currentAccount ? (
                  <button
                    type="button"
                    onClick={disconnectWallet}
                    className={`${glassButtonClass} border-rose-300/40 bg-rose-500/10 hover:border-rose-200/60 hover:bg-rose-500/20`}
                  >
                    Disconnect
                  </button>
                ) : null}
              </div>
            </GlassCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <GlassCard className="p-7" id="supplier-update">
              <SectionHeader
                eyebrow="Catalog upkeep"
                title="Update product records"
                description="Push supply-chain updates, adjust metadata, and attach compliance documents before distribution."
              />
              <Divider className="my-6" />
              <div className="space-y-3 text-sm text-white/70">
                <p>
                  Use the guided workflow to refresh product attributes, upload supporting documents, and synchronize on-chain provenance with partner systems.
                </p>
                <p>
                  Prefer scanning in the field? Jump to the live scanner to verify shipments before handoff.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/update-product" className={glassButtonClass}>
                  Launch update console
                </Link>
                <Link to="/supplier/scanner" className={glassButtonClass}>
                  Open live scanner
                </Link>
              </div>
            </GlassCard>
            <GlassCard className="p-7" id="supplier-transparency">
              <SectionHeader
                eyebrow="Transparency"
                title="Shipment hotspots"
                description="See where your verification activity concentrates and drill into transparency analytics."
              />
              <Divider className="my-6" />
              <div className="space-y-3 text-sm text-white/70">
                <p>Top locations (30d):</p>
                {topLocations.length ? (
                  <ul className="space-y-1 pl-4">
                    {topLocations.map((entry) => (
                      <li key={`${entry.location}-${entry.count}`} className="list-disc">
                        <span className="font-medium text-white">
                          {formatLocation(entry.location)}
                        </span>
                        <span className="text-white/60">
                          {" "}• {formatNumber(entry.count)} scans
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/60">
                    Location insights will surface once scans start streaming in.
                  </p>
                )}
                <p>
                  Visit Transparency to export reconciliation CSVs and share provenance evidence with retailers.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/transparency" className={glassButtonClass}>
                  Open transparency
                </Link>
                <Link to="/transparency?serial=" className={glassButtonClass}>
                  Quick lookup
                </Link>
              </div>
            </GlassCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <GlassCard className="p-7">
              <SectionHeader
                eyebrow="Activity trail"
                title="Recent supplier actions"
                description="Track the latest updates your team has made across product records, transparency exports, and access controls."
              />
              <Divider className="my-6" />
              {recentActivity.length ? (
                <div className="space-y-4">
                  {recentActivity.map((entry, index) => {
                    const tone = deriveActivityTone(entry?.action || "");
                    return (
                      <div
                        key={`${entry?.id || entry?.log_time || index}`}
                        className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/80"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${tone.badge}`}
                          >
                            {tone.icon}
                            <span className="font-semibold tracking-[0.2em]">
                              {entry?.action || "Activity"}
                            </span>
                          </span>
                          <span className="text-xs text-white/50">
                            {formatDateTime(entry?.log_time)}
                          </span>
                        </div>
                        {entry?.details || entry?.metadata ? (
                          <p className="mt-2 text-xs text-white/60">
                            {(typeof entry.metadata === "string" && entry.metadata) ||
                              (typeof entry.details === "string" && entry.details) ||
                              ""}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  No recent supplier activity in the last 30 days.
                </p>
              )}
            </GlassCard>
            <GlassCard className="p-7">
              <SectionHeader
                eyebrow="Scan intelligence"
                title="Recent verification events"
                description="Stay close to the latest authenticity checks impacting your shipments."
              />
              <Divider className="my-6" />
              {recentScans.length ? (
                <div className="space-y-3">
                  {recentScans.map((scan, index) => {
                    const status = scan?.isAuthentic
                      ? {
                          label: "Authentic",
                          badge:
                            "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
                        }
                      : scan?.isSuspicious
                      ? {
                          label: "Flagged",
                          badge:
                            "bg-rose-500/15 text-rose-200 border border-rose-400/30",
                        }
                      : {
                          label: "Scan",
                          badge:
                            "bg-white/10 text-white/70 border border-white/20",
                        };
                    return (
                      <div
                        key={`${scan?.id || scan?.scanTime || index}`}
                        className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/80"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-white">
                            {scan?.serialNumber || "Unknown serial"}
                          </span>
                          <span className="text-xs text-white/50">
                            {formatDateTime(scan?.scanTime)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 uppercase tracking-[0.3em] ${status.badge}`}
                          >
                            {status.label}
                          </span>
                          <span>{formatLocation(scan?.location)}</span>
                          {scan?.suspicionReason ? (
                            <span className="inline-flex items-center rounded-full border border-rose-300/30 bg-rose-500/10 px-3 py-1 text-rose-200">
                              {scan.suspicionReason}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  No scans recorded for your team in the last 30 days.
                </p>
              )}
            </GlassCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <GlassCard className="p-7 space-y-6" id="supplier-chat">
              <SectionHeader
                eyebrow="Support"
                title="Chat with operations"
                description="Open a secure thread with ProductGuard support for onboarding help, policy updates, or scan investigations."
              />
              <Divider className="my-4" />
              <p className="text-sm text-white/70">
                Use the floating chat beacon in the lower-right corner to start a live conversation. Threads stay linked to your supplier account for auditability.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleScrollToSection("chat");
                    openChatWidget();
                  }}
                  className={`${glassButtonClass} border-cyan-300/40 bg-cyan-500/10 hover:border-cyan-200/60 hover:bg-cyan-500/20`}
                >
                  Launch chat console
                </button>
                <a
                  href="mailto:support@productguard.io"
                  className={`${glassButtonClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`}
                >
                  Email support
                </a>
              </div>
            </GlassCard>
            <GlassCard className="p-7" id="supplier-security">
              <SectionHeader
                eyebrow="Security"
                title="Two-factor readiness"
                description="Harden account access so shipment edits and verifications stay trusted."
              />
              <Divider className="my-6" />
              <div className="space-y-3 text-sm text-white/70">
                <p>
                  Status:
                  <span className="ml-2 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em]">
                    {auth?.is2FAEnabled ? "Enabled" : "Disabled"}
                  </span>
                </p>
                <p>
                  Enforce two-factor authentication so only verified operators can edit product metadata or confirm shipments.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/2fa-settings" className={glassButtonClass}>
                  Manage 2FA
                </Link>
                <Link to="/profile" className={glassButtonClass}>
                  Review profile
                </Link>
              </div>
            </GlassCard>
          </section>
        </div>
      )}
    </AdminShell>
  );
};

export default Supplier;
