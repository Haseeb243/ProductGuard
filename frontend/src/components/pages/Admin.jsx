import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  glassButtonClass,
  SectionHeader,
  Divider,
} from "../admin/ui";
import useAuth from "../../hooks/useAuth";
const formatNumber = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) {
    return "0";
  }
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

const formatDateTime = (value, options = {}) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    ...options,
  });
};

const deriveConversationUser = (conversationKey) =>
  conversationKey?.startsWith("conv:user:")
    ? `@${conversationKey.replace("conv:user:", "")}`
    : conversationKey || "";

const normalizeActivityLogs = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.logs)) return payload.logs;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const deriveNotificationStats = (notifications = []) => {
  return notifications.reduce(
    (acc, item) => {
      const status = (item?.status || "queued").toLowerCase();
      if (acc[status] !== undefined) {
        acc[status] += 1;
      }
      return acc;
    },
    { sent: 0, queued: 0, failed: 0 }
  );
};

const sumByKey = (rows = [], key) =>
  rows.reduce((acc, row) => acc + Number(row?.[key] || 0), 0);

const activityTone = (action) => {
  if (!action) {
    return {
      icon: "•",
      badge: "bg-white/10 text-white/70",
      label: "Activity",
    };
  }
  const normalized = action.toLowerCase();
  if (normalized.includes("delete") || normalized.includes("revoke")) {
    return {
      icon: "−",
      badge: "bg-rose-500/15 text-rose-200 border border-rose-400/30",
      label: "Sensitive",
    };
  }
  if (normalized.includes("add") || normalized.includes("create")) {
    return {
      icon: "+",
      badge: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
      label: "Add",
    };
  }
  if (normalized.includes("login")) {
    return {
      icon: "👤",
      badge: "bg-sky-500/15 text-sky-100 border border-sky-400/30",
      label: "Login",
    };
  }
  if (normalized.includes("scan")) {
    return {
      icon: "🔍",
      badge: "bg-indigo-500/15 text-indigo-100 border border-indigo-400/30",
      label: "Scan",
    };
  }
  return {
    icon: "•",
    badge: "bg-white/10 text-white/70 border border-white/15",
    label: "Activity",
  };
};

const Admin = () => {
  const { apiBaseUrl } = useConfig();
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [scanTrend, setScanTrend] = useState([]);
  const [loginTrend, setLoginTrend] = useState([]);
  const [supportData, setSupportData] = useState({
    notifications: [],
    conversations: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const loadDashboard = useCallback(
    async ({ showSpinner = true } = {}) => {
      if (showSpinner) {
        setLoading(true);
      }
      setError(null);

      const includeSupport = auth?.role === "admin";

      try {
        const responses = await Promise.all([
          fetch(`${apiBaseUrl}/dashboard-analytics`),
          fetch(`${apiBaseUrl}/activity-logs?limit=8`),
          fetch(`${apiBaseUrl}/analytics/scans/daily?days=7`),
          fetch(`${apiBaseUrl}/analytics/logins/daily?days=7`),
          includeSupport
            ? fetch(`${apiBaseUrl}/support/notifications?limit=50`)
            : Promise.resolve(null),
          includeSupport
            ? fetch(`${apiBaseUrl}/support/conversations?limit=50`)
            : Promise.resolve(null),
        ]);

        const [
          analyticsRes,
          activityRes,
          scansRes,
          loginsRes,
          notificationsRes,
          conversationsRes,
        ] = responses;

        if (!analyticsRes.ok) {
          throw new Error("Failed to load analytics summary");
        }
        if (!activityRes.ok) {
          throw new Error("Failed to load recent activity");
        }

        const analyticsJson = await analyticsRes.json();
        const activityJson = await activityRes.json();

        let scansJson = { data: [] };
        if (scansRes && scansRes.ok) {
          scansJson = await scansRes.json();
        }

        let loginsJson = { data: [] };
        if (loginsRes && loginsRes.ok) {
          loginsJson = await loginsRes.json();
        }

        let notifications = [];
        if (notificationsRes && notificationsRes.ok) {
          const notificationsJson = await notificationsRes.json();
          notifications = notificationsJson?.notifications || [];
        }

        let conversations = [];
        if (conversationsRes && conversationsRes.ok) {
          const conversationsJson = await conversationsRes.json();
          conversations = conversationsJson?.conversations || [];
        }

        setAnalytics(analyticsJson);
        setRecentActivity(normalizeActivityLogs(activityJson).slice(0, 6));
        setScanTrend(Array.isArray(scansJson?.data) ? scansJson.data : []);
        setLoginTrend(Array.isArray(loginsJson?.data) ? loginsJson.data : []);
        setSupportData({ notifications, conversations });
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to load admin dashboard", err);
        setError(err.message || "Unable to load dashboard");
        toast.error(err.message || "Unable to load dashboard");
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [apiBaseUrl, auth?.role]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard({ showSpinner: false });
  }, [loadDashboard]);

  const totalUsers = useMemo(
    () =>
      (analytics?.userCounts || []).reduce(
        (acc, row) => acc + Number(row?.count || 0),
        0
      ),
    [analytics?.userCounts]
  );

  const authenticityRate = useMemo(
    () => formatPercent(analytics?.authenticScanCount, analytics?.scanCount),
    [analytics?.authenticScanCount, analytics?.scanCount]
  );

  const counterfeitRate = useMemo(
    () => formatPercent(analytics?.counterfeitScanCount, analytics?.scanCount),
    [analytics?.counterfeitScanCount, analytics?.scanCount]
  );

  const metaSummary = useMemo(
    () => [
      {
        label: "Users",
        value: formatNumber(totalUsers),
        key: "users",
      },
      {
        label: "Products",
        value: formatNumber(analytics?.productCount),
        key: "products",
      },
      {
        label: "Scans (30d)",
        value: formatNumber(analytics?.scanCount),
        key: "scans",
      },
      {
        label: "Updated",
        value: formatDateTime(lastUpdated, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        key: "updated",
      },
    ],
    [analytics?.productCount, analytics?.scanCount, lastUpdated, totalUsers]
  );

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Link to="/manage-account" className={`${glassButtonClass}`}>
        Manage accounts
      </Link>
      <Link to="/support-dashboard" className={`${glassButtonClass}`}>
        Support console
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className={`${glassButtonClass} border-rose-400/40 bg-rose-500/10 hover:border-rose-300/60 hover:bg-rose-500/20`}
      >
        Sign out
      </button>
      <button
        type="button"
        onClick={handleRefresh}
        className={`${glassButtonClass} ${
          refreshing ? "cursor-wait opacity-70" : ""
        }`}
        disabled={refreshing}
      >
        {refreshing ? "Refreshing…" : "Refresh data"}
      </button>
    </div>
  );

  const quickLinksToolbar = (
    <GlassCard className="w-full" padding="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/analytics" className={`${glassButtonClass}`}>
          Analytics dashboard
        </Link>
        <Link to="/audit-logs" className={`${glassButtonClass}`}>
          Audit logs
        </Link>
        <Link to="/transparency" className={`${glassButtonClass}`}>
          Transparency intelligence
        </Link>
        <Link to="/2fa-settings" className={`${glassButtonClass}`}>
          2FA controls
        </Link>
      </div>
    </GlassCard>
  );

  const scanTotals = useMemo(() => {
    if (!Array.isArray(scanTrend) || scanTrend.length === 0) {
      return {
        total: 0,
        authentic: 0,
        counterfeit: 0,
        suspicious: 0,
        average: 0,
        lastEntry: null,
        lastTotal: 0,
      };
    }
    const authentic = sumByKey(scanTrend, "authentic_scans");
    const counterfeit = sumByKey(scanTrend, "counterfeit_scans");
    const suspicious = sumByKey(scanTrend, "suspicious_scans");
    const total = authentic + counterfeit + suspicious;
    const average = Math.round(total / scanTrend.length);
    const lastEntry = scanTrend[scanTrend.length - 1] || null;
    const lastTotal = lastEntry
      ? Number(lastEntry.authentic_scans || 0) +
        Number(lastEntry.counterfeit_scans || 0) +
        Number(lastEntry.suspicious_scans || 0)
      : 0;

    return {
      total,
      authentic,
      counterfeit,
      suspicious,
      average,
      lastEntry,
      lastTotal,
    };
  }, [scanTrend]);

  const loginTotals = useMemo(() => {
    if (!Array.isArray(loginTrend) || loginTrend.length === 0) {
      return { success: 0, failure: 0, total: 0 };
    }
    const success = sumByKey(loginTrend, "successful_logins");
    const failure = sumByKey(loginTrend, "failed_logins");
    const total = success + failure;
    return { success, failure, total };
  }, [loginTrend]);

  const loginSuccessRate = formatPercent(
    loginTotals.success,
    loginTotals.total
  );

  const supportStats = useMemo(
    () => deriveNotificationStats(supportData.notifications),
    [supportData.notifications]
  );

  const conversationCount = supportData.conversations?.length || 0;

  const highlightedConversation = useMemo(() => {
    if (!conversationCount) return null;
    return [...supportData.conversations].sort((a, b) => {
      const aTime = new Date(
        a?.updated_at || a?.last_message_at || 0
      ).getTime();
      const bTime = new Date(
        b?.updated_at || b?.last_message_at || 0
      ).getTime();
      return bTime - aTime;
    })[0];
  }, [conversationCount, supportData.conversations]);

  const lastNotification = useMemo(() => {
    if (!supportData.notifications?.length) return null;
    return [...supportData.notifications].sort(
      (a, b) =>
        new Date(b?.created_at || b?.sent_at || 0).getTime() -
        new Date(a?.created_at || a?.sent_at || 0).getTime()
    )[0];
  }, [supportData.notifications]);

  const twoFactorEnabled = Boolean(auth?.is2FAEnabled);

  return (
    <AdminShell
      title="Operations Command Center"
      subtitle="Real-time oversight across verification, support, and security for the ProductGuard network."
      meta={metaSummary}
      actions={headerActions}
      toolbar={quickLinksToolbar}
    >
      {error ? (
        <GlassCard className="mx-auto max-w-2xl space-y-4 p-10 text-center">
          <h2 className="text-2xl font-semibold text-white">
            Dashboard unavailable
          </h2>
          <p className="text-white/70">{error}</p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRefresh}
              className={`${glassButtonClass} px-6`}
            >
              Retry load
            </button>
          </div>
        </GlassCard>
      ) : loading ? (
        <div className="flex h-72 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10">
          <GlassCard tone="highlight" className="p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/60">
                  ProductGuard network health
                </p>
                <h2 className="text-3xl font-semibold text-white">
                  Visibility across every trust surface
                </h2>
                <p className="text-sm text-white/70 max-w-3xl">
                  Monitor product verification throughput, high-signal audit
                  events, and support conversations from a single operational
                  runway. Drill into analytics, audit evidence, or security
                  policies in two clicks.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                  <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
                    Last refresh {formatDateTime(lastUpdated)}
                  </span>
                  <Link
                    to="/audit-logs"
                    className="rounded-full border border-white/12 px-3 py-1 text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    Review audit evidence →
                  </Link>
                </div>
              </div>
              <div className="rounded-3xl border border-white/12 bg-black/40 p-6 text-sm text-white/70 shadow-xl">
                <p className="uppercase tracking-[0.35em] text-[11px] text-white/50">
                  Verification posture
                </p>
                <p className="mt-3 text-4xl font-semibold text-white">
                  {authenticityRate}
                </p>
                <p className="mt-2 text-white/60">
                  Authentic scans across the last 30 days
                </p>
                <Divider className="my-4" />
                <div className="flex items-center gap-4 text-xs">
                  <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">
                    Authentic rate
                  </div>
                  <div className="rounded-full bg-rose-500/15 px-3 py-1 text-rose-200">
                    Counterfeit {counterfeitRate}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                Products under guardianship
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(analytics?.productCount)}
              </p>
              <p className="mt-3 text-sm text-white/60">
                Total serialized assets with transparency telemetry enabled.
              </p>
              <Link
                to="/transparency"
                className="mt-4 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
              >
                View transparency intelligence →
              </Link>
            </GlassCard>

            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                Verification throughput (7d)
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(scanTotals.total)}
              </p>
              <p className="mt-3 text-sm text-white/60">
                Avg {formatNumber(scanTotals.average)} per day • Last run{" "}
                {formatNumber(scanTotals.lastTotal)} scans
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-white/70">
                <div className="rounded-2xl bg-emerald-500/10 p-3">
                  <p className="text-emerald-200 text-lg font-semibold">
                    {formatNumber(scanTotals.authentic)}
                  </p>
                  <p>Authentic</p>
                </div>
                <div className="rounded-2xl bg-rose-500/10 p-3">
                  <p className="text-rose-200 text-lg font-semibold">
                    {formatNumber(scanTotals.counterfeit)}
                  </p>
                  <p>Counterfeit</p>
                </div>
                <div className="rounded-2xl bg-amber-500/10 p-3">
                  <p className="text-amber-100 text-lg font-semibold">
                    {formatNumber(scanTotals.suspicious)}
                  </p>
                  <p>Suspicious</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                User directory
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(totalUsers)}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-white/60">
                {(analytics?.userCounts || []).map((row) => (
                  <li
                    key={row.role}
                    className="flex items-center justify-between"
                  >
                    <span className="capitalize text-white/70">{row.role}</span>
                    <span className="font-semibold text-white">
                      {formatNumber(row.count)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/manage-account"
                className="mt-4 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
              >
                Open user management →
              </Link>
            </GlassCard>

            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                Support queue
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {conversationCount.toString().padStart(2, "0")}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-white/70">
                <div className="rounded-2xl bg-emerald-500/10 p-2">
                  <p className="text-emerald-200 text-lg font-semibold">
                    {supportStats.sent}
                  </p>
                  <p>Sent</p>
                </div>
                <div className="rounded-2xl bg-amber-500/10 p-2">
                  <p className="text-amber-100 text-lg font-semibold">
                    {supportStats.queued}
                  </p>
                  <p>Queued</p>
                </div>
                <div className="rounded-2xl bg-rose-500/10 p-2">
                  <p className="text-rose-200 text-lg font-semibold">
                    {supportStats.failed}
                  </p>
                  <p>Failed</p>
                </div>
              </div>
              <Link
                to="/support-dashboard"
                className="mt-4 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
              >
                Triage conversations →
              </Link>
            </GlassCard>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <GradientBorderCard>
              <div className="space-y-5">
                <SectionHeader
                  title="Audit pulse"
                  subtitle="Highest-signal events across the last refresh window."
                  actions={
                    <Link
                      to="/audit-logs"
                      className={`${glassButtonClass} text-xs`}
                    >
                      View audit logs
                    </Link>
                  }
                />
                {recentActivity.length ? (
                  <ul className="space-y-3">
                    {recentActivity.map((activity, index) => {
                      const tone = activityTone(activity?.action);
                      return (
                        <li
                          key={activity?.id || `${activity?.action}-${index}`}
                          className="rounded-3xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-base ${tone.badge}`}
                            >
                              {tone.icon}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-white">
                                  {activity?.username || "Unknown actor"}
                                </p>
                                <span className="text-xs text-white/60">
                                  {formatDateTime(activity?.log_time, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                                {tone.label}
                              </p>
                              <p className="text-sm text-white/70">
                                {(activity?.action || "Recorded").replace(
                                  /_/g,
                                  " "
                                )}
                                {activity?.target
                                  ? ` • ${activity.target}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-white/60">
                    No audit events captured in this window.
                  </div>
                )}
              </div>
            </GradientBorderCard>

            <GlassCard className="p-6">
              <SectionHeader
                title="Support heartbeat"
                subtitle="Outbound notifications and live conversations across teams."
                actions={
                  <Link
                    to="/support-dashboard"
                    className={`${glassButtonClass} text-xs`}
                  >
                    Open support
                  </Link>
                }
              />
              <div className="mt-5 grid gap-3 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Outbound notifications</span>
                  <span className="text-white font-semibold">
                    {supportData.notifications.length.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active conversations</span>
                  <span className="text-white font-semibold">
                    {conversationCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Latest conversation</span>
                  <span className="text-white/80">
                    {highlightedConversation
                      ? deriveConversationUser(
                          highlightedConversation.conversation_key
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last notification</span>
                  <span className="text-white/80">
                    {lastNotification
                      ? formatDateTime(lastNotification.created_at)
                      : "—"}
                  </span>
                </div>
              </div>
              <Divider className="my-5" />
              <div className="grid grid-cols-3 gap-3 text-center text-xs text-white/70">
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                  <p className="text-emerald-200 text-lg font-semibold">
                    {supportStats.sent}
                  </p>
                  <p>Sent</p>
                </div>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
                  <p className="text-amber-100 text-lg font-semibold">
                    {supportStats.queued}
                  </p>
                  <p>Queued</p>
                </div>
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3">
                  <p className="text-rose-200 text-lg font-semibold">
                    {supportStats.failed}
                  </p>
                  <p>Failed</p>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard className="p-6">
              <SectionHeader
                title="Verification analytics"
                subtitle="Spot trends across the last 7 days of scan telemetry."
                actions={
                  <Link
                    to="/analytics"
                    className={`${glassButtonClass} text-xs`}
                  >
                    Full analytics
                  </Link>
                }
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Total scans
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatNumber(scanTotals.total)}
                  </p>
                  <p className="mt-2 text-xs text-white/60">Seven day window</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Authenticity
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatPercent(scanTotals.authentic, scanTotals.total)}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    Authentic share of volume
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Risk flag rate
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatPercent(
                      scanTotals.counterfeit + scanTotals.suspicious,
                      scanTotals.total
                    )}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    Counterfeit + suspicious alerts
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-xs text-white/60">
                {scanTrend.slice(-5).map((entry) => {
                  const total =
                    Number(entry?.authentic_scans || 0) +
                    Number(entry?.counterfeit_scans || 0) +
                    Number(entry?.suspicious_scans || 0);
                  return (
                    <div
                      key={entry.date}
                      className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-3 py-2"
                    >
                      <span>
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-white font-semibold">
                        {formatNumber(total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <SectionHeader
                title="Security & 2FA"
                subtitle="Harden access with multi-factor enforcement and login monitoring."
                actions={
                  <Link
                    to="/2fa-settings"
                    className={`${glassButtonClass} text-xs`}
                  >
                    Manage 2FA
                  </Link>
                }
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                    Admin 2FA status
                  </p>
                  <p
                    className={`mt-3 text-2xl font-semibold ${
                      twoFactorEnabled ? "text-emerald-200" : "text-rose-200"
                    }`}
                  >
                    {twoFactorEnabled ? "Enabled" : "Disabled"}
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    {twoFactorEnabled
                      ? "Your admin account requires rotating passcodes on login."
                      : "Enable two-factor authentication to protect privileged actions."}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                    Login success rate (7d)
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {loginSuccessRate}
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    {formatNumber(loginTotals.success)} successful vs{" "}
                    {formatNumber(loginTotals.failure)} failed attempts.
                  </p>
                </div>
              </div>
              <Divider className="my-5" />
              <ul className="space-y-2 text-xs text-white/60">
                <li>
                  ✓ Ensure every admin has 2FA enabled before onboarding new
                  partners.
                </li>
                <li>
                  ⚠ Investigate repeated failed logins directly from the audit
                  logs view.
                </li>
              </ul>
            </GlassCard>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default Admin;
