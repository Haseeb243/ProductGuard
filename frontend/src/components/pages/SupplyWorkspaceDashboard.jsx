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

const defaultCopy = {
  shellTitle: "Supplier Logistics Deck",
  shellSubtitle:
    "Monitor verification scans, accelerate product updates, and keep fulfillment teams aligned.",
  workspaceLabel: "Supplier Hub",
  sidebarTitle: "Supplier",
  roleLabel: "Supplier",
  summaryEndpoint: "/supplier/scans-summary",
  workspaceSlug: "supplier",
  quickLinkRoutes: {
    profile: "/profile",
    scanner: "/supplier/scanner",
    updateProduct: "/update-product",
    transparency: "/transparency",
    wallet: "/supplier/wallet",
    chat: "/supplier/chat",
  },
  overviewEyebrow: "Supply chain health",
  overviewTitle: "Supplier scan overview",
  overviewDescription:
    "Track verification momentum, spot anomalies, and guide your team to the next action.",
  overviewCards: {
    scans30Label: "30 day scans",
    authenticRateLabel: "Authentic rate",
    suspiciousRateLabel: "Suspicious rate",
    averageDailyLabel: "Average daily scans",
  },
  scans30Text: "Across all supplier devices in the last month",
  authenticText: "Percentage of scans matching on-chain provenance",
  suspiciousText: "Triggers duplicate IP checks or contract mismatches",
  averageText: "Keep your supplier crew focused on consistent throughput",
  quickNavActivity: "Recent activity",
  quickNavLocations: "Top scan locations",
  quickNavSupport: "Contact support",
  chatButton: "Contact support",
  lastUpdatedLabel: "Last updated",
  autoRefreshLabel: "Auto refreshes every login",
  locationsTitle: "Top supplier scan locations",
  locationsEyebrow: "Geo spotlight",
  locationsDescription:
    "See where your verification activity concentrates and drill into transparency analytics.",
  locationsEmpty:
    "No scans recorded in the last 30 days. Encourage your team to verify inbound inventory.",
  activityTitle: "Latest supplier actions",
  activityEyebrow: "Ops timeline",
  activityDescription:
    "Trace the most recent custody updates, product registrations, and escalations.",
  activityEmpty: "No recent supplier activity logged in the last 30 entries.",
  scansTitle: "Last supplier scans",
  scansEyebrow: "Recent verifications",
  scansDescription:
    "Reference recent QR readings, confirm status, and jump into product detail updates.",
  scansEmpty:
    "No recent scans. Encourage your suppliers to verify batches as they move.",
  walletEyebrow: "Wallet status",
  walletTitle: "MetaMask connection",
  walletDescription:
    "Link your custody wallet to anchor supplier updates on-chain.",
  walletConnectedText: "Transactions sync to transparency dashboards",
  walletDisconnectedText: "Connect MetaMask to begin pushing custody updates",
  profileEyebrow: "Team identity",
  profileTitle: "Profile & trust signals",
  profileDescription:
    "Keep your supplier profile current so downstream partners recognize your shipments instantly.",
  updateEyebrow: "Catalog upkeep",
  updateTitle: "Update product records",
  updateDescription:
    "Push supply-chain updates, adjust metadata, and attach compliance documents before distribution.",
  transparencyEyebrow: "Transparency",
  transparencyTitle: "Shipment hotspots",
  transparencyDescription:
    "See where your verification activity concentrates and drill into transparency analytics.",
};

const SupplyWorkspaceDashboard = ({
  workspaceHook,
  copy: copyOverrides = {},
}) => {
  const copy = { ...defaultCopy, ...copyOverrides };
  copy.quickLinkRoutes = {
    ...defaultCopy.quickLinkRoutes,
    ...(copyOverrides.quickLinkRoutes || {}),
  };

  const roleLabel = copy.roleLabel || copy.sidebarTitle || "Supplier";
  const roleLower = roleLabel.toLowerCase();
  const applyRole = useCallback(
    (value) => {
      if (typeof value !== "string") return value;
      return value
        .replace(/Supplier/g, roleLabel)
        .replace(/supplier/g, roleLower);
    },
    [roleLabel, roleLower]
  );

  const {
    shellTitle,
    shellSubtitle,
    workspaceLabel,
    sidebarTitle,
    summaryEndpoint,
    workspaceSlug,
    quickLinkRoutes,
    overviewEyebrow,
    overviewTitle,
    overviewDescription,
    overviewCards,
    scans30Text,
    authenticText,
    suspiciousText,
    averageText,
    quickNavActivity,
    quickNavLocations,
    quickNavSupport,
    chatButton,
    lastUpdatedLabel,
    autoRefreshLabel,
    locationsTitle,
    locationsEyebrow,
    locationsDescription,
    locationsEmpty,
    activityTitle,
    activityEyebrow,
    activityDescription,
    activityEmpty,
    scansTitle,
    scansEyebrow,
    scansDescription,
    scansEmpty,
    walletEyebrow,
    walletTitle,
    walletDescription,
    walletConnectedText,
    walletDisconnectedText,
    profileEyebrow,
    profileTitle,
    profileDescription,
    updateEyebrow,
    updateTitle,
    updateDescription,
    transparencyEyebrow,
    transparencyTitle,
    transparencyDescription,
  } = copy;

  const { apiBaseUrl } = useConfig();
  const {
    auth,
    logout,
    sidebarLinks,
    walletAddress,
    connectWallet,
    disconnectWallet,
    checkingWallet,
    isCurrentRole,
  } = workspaceHook();
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

  const handleScrollToSection = useCallback(
    (sectionId) => {
      const element = document.getElementById(`${workspaceSlug}-${sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [workspaceSlug]
  );

  const openChatWidget = useCallback(() => {
    const chatFab = document.querySelector('button[aria-label="Open chat"]');
    if (chatFab) {
      chatFab.click();
    } else {
      toast.error("Chat widget is unavailable. Refresh the page to reload it.");
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
          fetch(`${apiBaseUrl}${summaryEndpoint}?${scanParams.toString()}`),
          fetch(`${apiBaseUrl}/activity-logs?${activityParams.toString()}`),
        ]);

        const scansJson = await scansRes.json().catch(() => null);
        if (!scansRes.ok || !scansJson?.success) {
          throw new Error(
            scansJson?.message || applyRole("Unable to load supplier summary")
          );
        }

        const activityJson = await activityRes.json().catch(() => null);
        if (!activityRes.ok) {
          throw new Error(applyRole("Unable to load supplier activity"));
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
        console.error(`${roleLabel} dashboard load failed`, err);
        const message =
          err?.message || applyRole("Unable to load supplier dashboard");
        setError(message);
        toast.error(message);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [apiBaseUrl, auth?.user, summaryEndpoint, applyRole, roleLabel]
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
        <Link to={quickLinkRoutes.profile} className={glassButtonClass}>
          Manage profile
        </Link>
        <Link to={quickLinkRoutes.scanner} className={glassButtonClass}>
          Launch scanner
        </Link>
        <Link to={quickLinkRoutes.updateProduct} className={glassButtonClass}>
          Update product
        </Link>
        <Link to={quickLinkRoutes.transparency} className={glassButtonClass}>
          Transparency
        </Link>
        <Link to={quickLinkRoutes.wallet} className={glassButtonClass}>
          Wallet
        </Link>
        <Link to={quickLinkRoutes.chat} className={glassButtonClass}>
          {applyRole(chatButton)}
        </Link>
      </div>
    </GlassCard>
  );

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Link to={quickLinkRoutes.updateProduct} className={glassButtonClass}>
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
      title={applyRole(shellTitle)}
      subtitle={applyRole(shellSubtitle)}
      meta={metaSummary}
      actions={headerActions}
      toolbar={quickLinksToolbar}
      sidebarTitle={applyRole(sidebarTitle)}
      sidebarLinks={sidebarLinks}
      forceSidebar={isCurrentRole}
      workspaceLabel={applyRole(workspaceLabel)}
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
          <section id={`${workspaceSlug}-overview`}>
            <GradientBorderCard className="relative overflow-hidden p-8">
              <span className="pointer-events-none absolute -left-20 top-10 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
              <span className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <SectionHeader
                    eyebrow={applyRole(overviewEyebrow)}
                    title={applyRole(overviewTitle)}
                    description={applyRole(overviewDescription)}
                  />
                  <div className="mt-6 grid gap-4 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-4">
                    <GlassCard className="p-4">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                        {applyRole(overviewCards.scans30Label)}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {formatNumber(totalScans30d)}
                      </p>
                      <p className="text-xs text-white/50">
                        {applyRole(scans30Text)}
                      </p>
                    </GlassCard>
                    <GlassCard className="p-4">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                        {applyRole(overviewCards.authenticRateLabel)}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {authenticRate}
                      </p>
                      <p className="text-xs text-white/50">
                        {applyRole(authenticText)}
                      </p>
                    </GlassCard>
                    <GlassCard className="p-4">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                        {applyRole(overviewCards.suspiciousRateLabel)}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {suspiciousRate}
                      </p>
                      <p className="text-xs text-white/50">
                        {applyRole(suspiciousText)}
                      </p>
                    </GlassCard>
                    <GlassCard className="p-4">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                        {applyRole(overviewCards.averageDailyLabel)}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {averageDailyScans}
                      </p>
                      <p className="text-xs text-white/50">
                        {applyRole(averageText)}
                      </p>
                    </GlassCard>
                  </div>
                </div>
                <div className="lg:w-[320px]">
                  <GlassCard className="p-5 text-sm text-white/70">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                      Quick navigation
                    </p>
                    <div className="mt-4 space-y-3">
                      <button
                        type="button"
                        onClick={() => handleScrollToSection("activity")}
                        className={`${glassButtonClass} w-full justify-center`}
                      >
                        {applyRole(quickNavActivity)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScrollToSection("locations")}
                        className={`${glassButtonClass} w-full justify-center`}
                      >
                        {applyRole(quickNavLocations)}
                      </button>
                      <button
                        type="button"
                        onClick={openChatWidget}
                        className={`${glassButtonClass} w-full justify-center`}
                      >
                        {applyRole(quickNavSupport)}
                      </button>
                    </div>
                    <p className="mt-4 text-xs text-white/40">
                      {lastUpdated
                        ? `${applyRole(lastUpdatedLabel)}: ${formatDateTime(
                            lastUpdated
                          )}`
                        : applyRole(autoRefreshLabel)}
                    </p>
                  </GlassCard>
                </div>
              </div>
            </GradientBorderCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <GlassCard className="p-7" id={`${workspaceSlug}-profile`}>
              <SectionHeader
                eyebrow={applyRole(profileEyebrow)}
                title={applyRole(profileTitle)}
                description={applyRole(profileDescription)}
              />
              <Divider className="my-6" />
              <div className="grid gap-4 text-sm text-white/70 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    {applyRole("Username")}
                  </p>
                  <p className="mt-1 text-base text-white">
                    {auth?.user || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    {applyRole("Role")}
                  </p>
                  <p className="mt-1 text-base text-white">
                    {auth?.role || roleLabel}
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
                    {auth?.is2FAEnabled
                      ? applyRole("Enabled")
                      : applyRole("Disabled")}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/profile" className={glassButtonClass}>
                  {applyRole("Edit profile")}
                </Link>
                <Link to="/2fa-settings" className={glassButtonClass}>
                  {applyRole("Configure 2FA")}
                </Link>
              </div>
            </GlassCard>
            <GlassCard className="p-7" id={`${workspaceSlug}-wallet-summary`}>
              <SectionHeader
                eyebrow={applyRole(walletEyebrow)}
                title={applyRole(walletTitle)}
                description={applyRole(walletDescription)}
              />
              <Divider className="my-6" />
              <div className="space-y-4 text-sm text-white/70">
                <p>
                  {applyRole("Status")}:
                  <span className="ml-2 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em]">
                    {walletAddress
                      ? applyRole("Connected")
                      : applyRole("Disconnected")}
                  </span>
                </p>
                <p>
                  {applyRole("Active account")}:
                  <span className="ml-2 font-semibold text-white">
                    {shortenAddress(walletAddress)}
                  </span>
                </p>
                <p>
                  {walletAddress
                    ? applyRole(walletConnectedText)
                    : applyRole(walletDisconnectedText)}
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
                    : walletAddress
                    ? applyRole("Switch wallet")
                    : applyRole("Connect wallet")}
                </button>
                {walletAddress ? (
                  <button
                    type="button"
                    onClick={disconnectWallet}
                    className={`${glassButtonClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`}
                  >
                    {applyRole("Disconnect")}
                  </button>
                ) : null}
                <Link to={quickLinkRoutes.wallet} className={glassButtonClass}>
                  {applyRole("Manage wallet")}
                </Link>
              </div>
            </GlassCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <GlassCard className="p-7" id={`${workspaceSlug}-updates`}>
              <SectionHeader
                eyebrow={applyRole(updateEyebrow)}
                title={applyRole(updateTitle)}
                description={applyRole(updateDescription)}
              />
              <Divider className="my-6" />
              <div className="space-y-3 text-sm text-white/70">
                <p>
                  {applyRole(
                    "Use the guided workflow to refresh product attributes, upload supporting documents, and synchronize on-chain provenance with partner systems."
                  )}
                </p>
                <p>
                  {applyRole(
                    "Prefer scanning in the field? Jump to the live scanner to verify shipments before handoff."
                  )}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/update-product" className={glassButtonClass}>
                  {applyRole("Launch update console")}
                </Link>
                <Link to={quickLinkRoutes.scanner} className={glassButtonClass}>
                  {applyRole("Open live scanner")}
                </Link>
              </div>
            </GlassCard>
            <GlassCard className="p-7" id={`${workspaceSlug}-transparency`}>
              <SectionHeader
                eyebrow={applyRole(transparencyEyebrow)}
                title={applyRole(transparencyTitle)}
                description={applyRole(transparencyDescription)}
              />
              <Divider className="my-6" />
              <div className="space-y-3 text-sm text-white/70">
                <p>{applyRole("Top locations (30d):")}</p>
                {topLocations.length ? (
                  <ul className="space-y-1 pl-4">
                    {topLocations.map((entry) => (
                      <li
                        key={`${entry.location}-${entry.count}`}
                        className="list-disc"
                      >
                        <span className="font-medium text-white">
                          {formatLocation(entry.location)}
                        </span>
                        <span className="text-white/60">
                          {" "}
                          • {formatNumber(entry.count)} {applyRole("scans")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/60">
                    {applyRole(
                      "Location insights will surface once scans start streaming in."
                    )}
                  </p>
                )}
                <p>
                  {applyRole(
                    "Visit Transparency to export reconciliation CSVs and share provenance evidence with partners."
                  )}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={quickLinkRoutes.transparency}
                  className={glassButtonClass}
                >
                  {applyRole("Open transparency")}
                </Link>
                <Link to="/transparency?serial=" className={glassButtonClass}>
                  {applyRole("Quick lookup")}
                </Link>
              </div>
            </GlassCard>
          </section>

          <section id={`${workspaceSlug}-locations`}>
            <GlassCard className="p-8">
              <SectionHeader
                eyebrow={applyRole(locationsEyebrow)}
                title={applyRole(locationsTitle)}
                description={applyRole(
                  locationsDescription ||
                    "See which warehouses or regions are driving verification volume right now."
                )}
              />
              <Divider className="my-6" />
              {topLocations.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {topLocations.map((item) => (
                    <div
                      key={`${item.location}-${item.count}`}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70"
                    >
                      <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                        {applyRole("Hub")}
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {formatLocation(item.location)}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        {applyRole("Scans in 30 days")}:{" "}
                        {formatNumber(item.count)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  {applyRole(locationsEmpty)}
                </p>
              )}
            </GlassCard>
          </section>

          <section id={`${workspaceSlug}-activity`}>
            <GlassCard className="p-8">
              <SectionHeader
                eyebrow={applyRole(activityEyebrow)}
                title={applyRole(activityTitle)}
                description={applyRole(activityDescription)}
              />
              <Divider className="my-6" />
              {recentActivity.length ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const tone = deriveActivityTone(activity.action);
                    return (
                      <div
                        key={`${activity.log_time}-${index}`}
                        className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="font-semibold text-white">
                            {activity.action}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${tone.badge}`}
                          >
                            {tone.icon} {applyRole("Supplier")}
                          </span>
                        </div>
                        <div className="text-xs text-white/50">
                          {formatDateTime(activity.log_time)} •{" "}
                          {activity.details || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  {applyRole(activityEmpty)}
                </p>
              )}
            </GlassCard>
          </section>

          <section id={`${workspaceSlug}-recent-scans`}>
            <GlassCard className="p-8">
              <SectionHeader
                eyebrow={applyRole(scansEyebrow)}
                title={applyRole(scansTitle)}
                description={applyRole(scansDescription)}
              />
              <Divider className="my-6" />
              {recentScans.length ? (
                <div className="space-y-4">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-semibold text-white">
                          {scan.serialNumber || "Unknown serial"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                            scan.isAuthentic
                              ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                              : "border-rose-300/40 bg-rose-500/15 text-rose-200"
                          }`}
                        >
                          {scan.isAuthentic
                            ? applyRole("Authentic")
                            : applyRole("Flagged")}
                        </span>
                      </div>
                      <div className="text-xs text-white/60 break-all">
                        {scan.serialNumber || "No serial captured"}
                      </div>
                      <div className="text-xs text-white/50">
                        {formatDateTime(scan.scanTime)}
                      </div>
                      <div className="text-xs text-white/60">
                        {applyRole("Location")}: {formatLocation(scan.location)}
                      </div>
                      {scan.suspicionReason ? (
                        <div className="text-xs text-rose-200/80">
                          {applyRole("Suspicion")}: {scan.suspicionReason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">{applyRole(scansEmpty)}</p>
              )}
            </GlassCard>
          </section>

          <section id={`${workspaceSlug}-wallet`}>
            <GradientBorderCard className="p-8">
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-6">
                  <SectionHeader
                    eyebrow={applyRole(walletEyebrow)}
                    title={applyRole(walletTitle)}
                    description={applyRole(walletDescription)}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <GlassCard className="p-4 text-sm text-white/70">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                        Wallet status
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {walletAddress
                          ? applyRole("Connected")
                          : applyRole("Disconnected")}
                      </p>
                      <p className="text-xs text-white/50">
                        {walletAddress
                          ? applyRole(walletConnectedText)
                          : applyRole(walletDisconnectedText)}
                      </p>
                    </GlassCard>
                    <GlassCard className="p-4 text-sm text-white/70">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                        Active account
                      </p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        {shortenAddress(walletAddress)}
                      </p>
                      <p className="text-xs text-white/50">
                        {applyRole(
                          "Switch MetaMask accounts to update who signs supplier events."
                        )}
                      </p>
                    </GlassCard>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
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
                        : walletAddress
                        ? applyRole("Switch wallet")
                        : applyRole("Connect wallet")}
                    </button>
                    {walletAddress ? (
                      <button
                        type="button"
                        onClick={disconnectWallet}
                        className={`${glassButtonClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`}
                      >
                        {applyRole("Disconnect")}
                      </button>
                    ) : null}
                    <Link
                      to={quickLinkRoutes.wallet}
                      className={`${glassButtonClass}`}
                    >
                      {applyRole("Manage wallet")}
                    </Link>
                  </div>
                </div>
                <GlassCard className="p-6 text-sm text-white/70">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                    Why connect?
                  </p>
                  <ul className="mt-4 space-y-3 list-disc pl-5">
                    <li>
                      {applyRole(
                        "Sign supplier custody updates before assets move downstream."
                      )}
                    </li>
                    <li>
                      {applyRole(
                        "Give retailers confidence with immutable on-chain proofs."
                      )}
                    </li>
                    <li>
                      {applyRole(
                        "Reduce investigation time when issues arise across the network."
                      )}
                    </li>
                  </ul>
                </GlassCard>
              </div>
            </GradientBorderCard>
          </section>
        </div>
      )}
    </AdminShell>
  );
};

export default SupplyWorkspaceDashboard;
