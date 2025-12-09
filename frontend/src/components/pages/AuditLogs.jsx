import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import { GlassCard, glassButtonClass, glassSelectClass } from "../admin/ui";

const LOG_TYPE_LABELS = {
  activity: "Activity",
  login: "Login Attempts",
  scan: "Product Scans",
};

const INITIAL_FILTERS = {
  username: "",
  days: 30,
  success: "",
  isAuthentic: "",
  isSuspicious: "",
  action: "",
  serialNumber: "",
};

const controlBaseClasses =
  "w-full border border-white/12 bg-white/5 text-sm text-white/80 transition focus:border-white/40 focus:outline-none focus:ring-0";

const inputClasses = `${controlBaseClasses} rounded-2xl px-4 py-2.5 placeholder-white/40`;

const selectClasses = `${glassSelectClass} pr-10 text-sm`;

const chipClasses =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80";

const badgeBase =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";

const statusBadge = {
  success: `${badgeBase} bg-emerald-500/15 text-emerald-200 border border-emerald-300/30`,
  danger: `${badgeBase} bg-rose-500/15 text-rose-200 border border-rose-300/30`,
  warning: `${badgeBase} bg-amber-500/15 text-amber-100 border border-amber-300/30`,
  info: `${badgeBase} bg-sky-500/15 text-sky-100 border border-sky-300/30`,
};

const SelectControl = ({
  value,
  onChange,
  children,
  className = "",
  size = "default",
}) => {
  const sizeClasses =
    size === "pill"
      ? "rounded-full px-5 py-2 text-sm"
      : "rounded-2xl px-4 py-2.5 text-sm";
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className={`${selectClasses} ${sizeClasses} text-white/90 backdrop-blur-sm`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
};

const formatNumber = (value) => Number(value ?? 0).toLocaleString();

const formatLabel = (value) => {
  if (!value) return "—";
  return value
    .toString()
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const DownloadIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 5v10m0 0l-4-4m4 4l4-4m3 8H9a3 3 0 01-3-3V7"
    />
  </svg>
);

const endpointForLogType = {
  activity: "activity-logs",
  login: "login-attempts",
  scan: "product-scans",
};

const AuditLogs = () => {
  const { apiBaseUrl } = useConfig();
  const [logs, setLogs] = useState([]);
  const [logType, setLogType] = useState("activity");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [dailyAnalytics, setDailyAnalytics] = useState({
    scans: [],
    logins: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const activeFilters = useMemo(() => {
    const entries = [];
    if (filters.username) {
      entries.push({ label: "User", value: filters.username });
    }
    if (logType === "login" && filters.success) {
      entries.push({
        label: "Status",
        value: filters.success === "true" ? "Success" : "Failed",
      });
    }
    if (logType === "scan" && filters.serialNumber) {
      entries.push({ label: "Serial", value: filters.serialNumber });
    }
    if (logType === "scan" && filters.isAuthentic) {
      entries.push({
        label: "Authenticity",
        value: filters.isAuthentic === "true" ? "Authentic" : "Counterfeit",
      });
    }
    if (logType === "activity" && filters.action) {
      entries.push({ label: "Action", value: filters.action });
    }
    if (filters.isSuspicious && logType === "scan") {
      entries.push({
        label: "Suspicious",
        value: filters.isSuspicious === "true" ? "Only" : "Exclude",
      });
    }
    return entries;
  }, [filters, logType]);

  const metaSummary = useMemo(() => {
    const logLabel = LOG_TYPE_LABELS[logType] || LOG_TYPE_LABELS.activity;
    const windowLabel = `${filters.days}d window`;
    const recordsLabel = `${logs.length.toLocaleString()} records`;
    const filtersLabel = activeFilters.length
      ? `${activeFilters.length} active`
      : "Filters off";
    const updatedLabel = lastRefreshed
      ? new Date(lastRefreshed).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Pending";

    return [
      { label: "Log Type", value: logLabel, key: "log-type" },
      { label: "Time Frame", value: windowLabel, key: "window" },
      { label: "Records", value: recordsLabel, key: "records" },
      { label: "Filters", value: filtersLabel, key: "filters" },
      { label: "Updated", value: updatedLabel, key: "updated" },
    ];
  }, [activeFilters.length, filters.days, lastRefreshed, logType, logs.length]);

  const summaryCards = useMemo(() => {
    const uniqueUsersCount = new Set(
      logs.map((log) => log.username).filter(Boolean)
    ).size;
    const uniqueUsersValue = formatNumber(uniqueUsersCount);

    if (logType === "activity") {
      const actionCounts = logs.reduce((acc, log) => {
        const actionKey = log.action || "unspecified";
        acc[actionKey] = (acc[actionKey] || 0) + 1;
        return acc;
      }, {});
      const [[topActionKey = "", topActionCount = 0] = []] = Object.entries(
        actionCounts
      ).sort((a, b) => b[1] - a[1]);
      const sensitivePattern = /(delete|update|revoke|suspend|disable)/i;
      const sensitiveCount = logs.filter((log) =>
        sensitivePattern.test(log.action || "")
      ).length;
      const targetedCount = logs.filter((log) => Boolean(log.target)).length;

      return [
        {
          key: "actors",
          label: "Unique actors",
          value: uniqueUsersValue,
          helper: "Distinct user accounts in this view",
          accent: "bg-emerald-500/25",
        },
        {
          key: "top-action",
          label: "Most common action",
          value: topActionCount ? formatLabel(topActionKey) : "—",
          helper: topActionCount
            ? `${formatNumber(topActionCount)} occurrences`
            : "No activity recorded",
          accent: "bg-sky-500/25",
        },
        {
          key: "sensitive",
          label: "Sensitive operations",
          value: formatNumber(sensitiveCount),
          helper: "Delete & privilege changes",
          accent: "bg-amber-500/25",
        },
        {
          key: "targets",
          label: "Records touched",
          value: formatNumber(targetedCount),
          helper: "Entries specifying a target",
          accent: "bg-indigo-500/25",
        },
      ];
    }

    if (logType === "login") {
      const successCount = logs.filter((log) => Boolean(log.success)).length;
      const failureCount = logs.length - successCount;
      const successRate = logs.length
        ? ((successCount / logs.length) * 100).toFixed(1)
        : "0.0";
      const uniqueIps = new Set(
        logs.map((log) => log.ip_address).filter(Boolean)
      ).size;

      return [
        {
          key: "success-rate",
          label: "Success rate",
          value: `${successRate}%`,
          helper: `${formatNumber(successCount)} successful attempts`,
          accent: "bg-emerald-500/25",
        },
        {
          key: "failures",
          label: "Failed attempts",
          value: formatNumber(failureCount),
          helper: "During the selected window",
          accent: "bg-rose-500/25",
        },
        {
          key: "ips",
          label: "Unique IP sources",
          value: formatNumber(uniqueIps),
          helper: "Network origins observed",
          accent: "bg-sky-500/25",
        },
        {
          key: "accounts",
          label: "Accounts observed",
          value: uniqueUsersValue,
          helper: "Distinct usernames",
          accent: "bg-indigo-500/25",
        },
      ];
    }

    if (logType === "scan") {
      const authenticCount = logs.filter((log) =>
        Boolean(log.is_authentic)
      ).length;
      const counterfeitCount = logs.length - authenticCount;
      const suspiciousCount = logs.filter((log) =>
        Boolean(log.is_suspicious)
      ).length;
      const uniqueLocations = new Set(
        logs.map((log) => log.location).filter(Boolean)
      ).size;
      const authenticRate = logs.length
        ? ((authenticCount / logs.length) * 100).toFixed(1)
        : "0.0";

      return [
        {
          key: "authentic-rate",
          label: "Authentic rate",
          value: `${authenticRate}%`,
          helper: `${formatNumber(authenticCount)} authentic scans`,
          accent: "bg-emerald-500/25",
        },
        {
          key: "counterfeit",
          label: "Counterfeit flagged",
          value: formatNumber(counterfeitCount),
          helper: "Detected within this view",
          accent: "bg-rose-500/25",
        },
        {
          key: "suspicious",
          label: "Suspicious alerts",
          value: formatNumber(suspiciousCount),
          helper: "Marked for deeper review",
          accent: "bg-amber-500/25",
        },
        {
          key: "locations",
          label: "Unique locations",
          value: formatNumber(uniqueLocations),
          helper: "Based on scan metadata",
          accent: "bg-sky-500/25",
        },
      ];
    }

    return [
      {
        key: "actors",
        label: "Unique actors",
        value: uniqueUsersValue,
        helper: "Distinct user accounts in this view",
        accent: "bg-emerald-500/25",
      },
      {
        key: "records",
        label: "Records in view",
        value: formatNumber(logs.length),
        helper: "Matches current filters",
        accent: "bg-sky-500/25",
      },
      {
        key: "filters",
        label: "Active filters",
        value: formatNumber(activeFilters.length),
        helper: "Applied constraints",
        accent: "bg-amber-500/25",
      },
      {
        key: "updated",
        label: "Last refreshed",
        value: lastRefreshed
          ? new Date(lastRefreshed).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
        helper: "Local browser time",
        accent: "bg-indigo-500/25",
      },
    ];
  }, [activeFilters.length, lastRefreshed, logType, logs]);

  const buildParams = useCallback(
    ({ includeLimit = true } = {}) => {
      const params = new URLSearchParams();
      if (includeLimit) {
        params.append("limit", "100");
      }
      if (filters.username) params.append("username", filters.username);
      if (filters.days) params.append("days", filters.days.toString());

      if (logType === "login") {
        if (filters.success) params.append("success", filters.success);
      }

      if (logType === "scan") {
        if (filters.isAuthentic)
          params.append("isAuthentic", filters.isAuthentic);
        if (filters.isSuspicious)
          params.append("isSuspicious", filters.isSuspicious);
        if (filters.serialNumber)
          params.append("serialNumber", filters.serialNumber);
      }

      if (logType === "activity") {
        if (filters.action) params.append("action", filters.action);
      }

      return params.toString();
    },
    [filters, logType]
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint =
        endpointForLogType[logType] || endpointForLogType.activity;
      const queryString = buildParams();
      const res = await fetch(`${apiBaseUrl}/${endpoint}?${queryString}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const parsed = Array.isArray(data) ? data : data?.data ?? [];
      setLogs(parsed);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Failed to load logs", error);
      toast.error(error.message || "Failed to load logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, buildParams, logType]);

  const fetchDailyAnalytics = useCallback(async () => {
    try {
      const [scansRes, loginsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/analytics/scans/daily?days=${filters.days}`),
        fetch(`${apiBaseUrl}/analytics/logins/daily?days=${filters.days}`),
      ]);

      const scansJson = scansRes.ok ? await scansRes.json() : { data: [] };
      const loginsJson = loginsRes.ok ? await loginsRes.json() : { data: [] };

      setDailyAnalytics({
        scans: scansJson?.data ?? [],
        logins: loginsJson?.data ?? [],
      });
    } catch (error) {
      console.error("Failed to load daily analytics", error);
    }
  }, [apiBaseUrl, filters.days]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchDailyAnalytics();
  }, [fetchDailyAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchLogs(), fetchDailyAnalytics()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadLogs = () => {
    try {
      const queryString = buildParams();
      const url = `${apiBaseUrl}/download-logs/${logType}${
        queryString ? `?${queryString}` : ""
      }`;
      window.open(url, "_blank");
    } catch (error) {
      console.error("Failed to download logs", error);
      toast.error("Failed to download logs");
    }
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleRefresh}
        className={`${glassButtonClass} ${
          refreshing ? "cursor-wait opacity-70" : ""
        }`}
        disabled={refreshing}
      >
        {refreshing ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <span className="text-base">⟳</span>
        )}
        <span>{refreshing ? "Refreshing" : "Refresh data"}</span>
      </button>
      <button
        type="button"
        onClick={handleDownloadLogs}
        className={glassButtonClass}
      >
        <DownloadIcon />
        <span>Download CSV</span>
      </button>
    </div>
  );

  const filterToolbar = (
    <GlassCard className="w-full space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/40">
            Filters
          </p>
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Tune the audit signal
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <SelectControl
            value={logType}
            onChange={(event) => setLogType(event.target.value)}
            size="pill"
            className="min-w-[10rem]"
          >
            <option value="activity">Activity Logs</option>
            <option value="login">Login Attempts</option>
            <option value="scan">Product Scans</option>
          </SelectControl>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-white/70 transition hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            Username
          </span>
          <input
            type="text"
            placeholder="e.g. jessica.davis"
            value={filters.username}
            onChange={(event) =>
              handleFilterChange("username", event.target.value)
            }
            className={inputClasses}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            Time window
          </span>
          <SelectControl
            value={filters.days}
            onChange={(event) =>
              handleFilterChange(
                "days",
                Number.parseInt(event.target.value, 10)
              )
            }
            className="w-full"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </SelectControl>
        </label>
        {logType === "activity" ? (
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-white/50">
              Action
            </span>
            <SelectControl
              value={filters.action}
              onChange={(event) =>
                handleFilterChange("action", event.target.value)
              }
              className="w-full"
            >
              <option value="">All actions</option>
              <option value="add_product">Add product</option>
              <option value="delete_user">Delete user</option>
              <option value="login">Login</option>
              <option value="register">Register</option>
              <option value="update_role">Update role</option>
            </SelectControl>
          </label>
        ) : null}
        {logType === "login" ? (
          <>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                Login status
              </span>
              <SelectControl
                value={filters.success}
                onChange={(event) =>
                  handleFilterChange("success", event.target.value)
                }
                className="w-full"
              >
                <option value="">All attempts</option>
                <option value="true">Successful only</option>
                <option value="false">Failed only</option>
              </SelectControl>
            </label>
          </>
        ) : null}
        {logType === "scan" ? (
          <>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                Serial number
              </span>
              <input
                type="text"
                placeholder="PG-1020-9921"
                value={filters.serialNumber}
                onChange={(event) =>
                  handleFilterChange("serialNumber", event.target.value)
                }
                className={inputClasses}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                Authenticity
              </span>
              <SelectControl
                value={filters.isAuthentic}
                onChange={(event) =>
                  handleFilterChange("isAuthentic", event.target.value)
                }
                className="w-full"
              >
                <option value="">All scans</option>
                <option value="true">Authentic only</option>
                <option value="false">Counterfeit only</option>
              </SelectControl>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-white/50">
                Suspicious flag
              </span>
              <SelectControl
                value={filters.isSuspicious}
                onChange={(event) =>
                  handleFilterChange("isSuspicious", event.target.value)
                }
                className="w-full"
              >
                <option value="">Include all</option>
                <option value="true">Only flagged</option>
                <option value="false">Hide flagged</option>
              </SelectControl>
            </label>
          </>
        ) : null}
        <div className="flex h-full flex-col justify-end">
          <button
            type="button"
            onClick={handleDownloadLogs}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/15"
          >
            <DownloadIcon />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
      {activeFilters.length ? (
        <div className="flex flex-wrap gap-3">
          {activeFilters.map((chip) => (
            <span key={`${chip.label}-${chip.value}`} className={chipClasses}>
              <span className="uppercase tracking-wide text-[0.6rem] text-white/50">
                {chip.label}
              </span>
              <span className="font-medium text-white/90">{chip.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </GlassCard>
  );

  const columnCount = logType === "scan" ? 6 : logType === "login" ? 4 : 5;

  const renderTableHeader = () => {
    if (logType === "activity") {
      return (
        <tr>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            User
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            Action
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            Target
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            Details
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            Timestamp
          </th>
        </tr>
      );
    }
    if (logType === "login") {
      return (
        <tr>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            User
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            Outcome
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            IP address
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            Timestamp
          </th>
        </tr>
      );
    }
    return (
      <tr>
        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
          Serial number
        </th>
        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
          User
        </th>
        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
          Location
        </th>
        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
          Authentic
        </th>
        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
          Suspicious
        </th>
        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
          Timestamp
        </th>
      </tr>
    );
  };

  const renderActivityRow = (log) => (
    <tr
      key={log.id ?? `${log.username}-${log.log_time}`}
      className="transition hover:bg-white/5"
    >
      <td className="px-6 py-3 text-sm font-medium text-white">
        {log.username || "—"}
      </td>
      <td className="px-6 py-3 text-sm">
        <span className={statusBadge.info}>{log.action || "—"}</span>
      </td>
      <td className="px-6 py-3 text-sm text-white/70">{log.target || "—"}</td>
      <td className="px-6 py-3 text-sm text-white/60">
        <span title={log.details || ""} className="block max-w-xs truncate">
          {log.details || "—"}
        </span>
      </td>
      <td className="px-6 py-3 text-xs font-medium text-white/50">
        {log.log_time ? new Date(log.log_time).toLocaleString() : "—"}
      </td>
    </tr>
  );

  const renderLoginRow = (log) => (
    <tr
      key={log.id ?? `${log.username}-${log.attempt_time}`}
      className="transition hover:bg-white/5"
    >
      <td className="px-6 py-3 text-sm font-medium text-white">
        {log.username || "—"}
      </td>
      <td className="px-6 py-3 text-sm">
        <span
          className={log.success ? statusBadge.success : statusBadge.danger}
        >
          {log.success ? "Success" : "Failed"}
        </span>
      </td>
      <td className="px-6 py-3 text-sm font-mono text-white/70">
        {log.ip_address || "—"}
      </td>
      <td className="px-6 py-3 text-xs font-medium text-white/50">
        {log.attempt_time ? new Date(log.attempt_time).toLocaleString() : "—"}
      </td>
    </tr>
  );

  const renderScanRow = (log) => (
    <tr
      key={log.id ?? `${log.serial_number}-${log.scan_time}`}
      className="transition hover:bg-white/5"
    >
      <td className="px-6 py-3 text-sm font-mono text-white">
        {log.serial_number || "—"}
      </td>
      <td className="px-6 py-3 text-sm text-white/80">
        {log.username || "Consumer"}
      </td>
      <td className="px-6 py-3 text-sm text-white/60">
        {log.location || "Unknown"}
      </td>
      <td className="px-6 py-3 text-sm">
        <span
          className={
            log.is_authentic ? statusBadge.success : statusBadge.danger
          }
        >
          {log.is_authentic ? "Authentic" : "Counterfeit"}
        </span>
      </td>
      <td className="px-6 py-3 text-sm">
        {log.is_suspicious ? (
          <span className={statusBadge.warning}>Flagged</span>
        ) : (
          <span className="text-white/40">—</span>
        )}
      </td>
      <td className="px-6 py-3 text-xs font-medium text-white/50">
        {log.scan_time ? new Date(log.scan_time).toLocaleString() : "—"}
      </td>
    </tr>
  );

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td
            colSpan={columnCount}
            className="px-6 py-16 text-center text-white/60"
          >
            <div className="inline-flex items-center gap-3">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Loading logs…</span>
            </div>
          </td>
        </tr>
      );
    }

    if (!logs.length) {
      return (
        <tr>
          <td
            colSpan={columnCount}
            className="px-6 py-16 text-center text-white/50"
          >
            <div className="space-y-3">
              <span className="text-4xl">📭</span>
              <div className="space-y-1">
                <p className="text-base font-semibold text-white/80">
                  No logs match the current filters
                </p>
                <p className="text-sm text-white/60">
                  Adjust the filters or expand the time window to explore more
                  activity.
                </p>
              </div>
            </div>
          </td>
        </tr>
      );
    }

    if (logType === "activity") {
      return logs.map((log) => renderActivityRow(log));
    }
    if (logType === "login") {
      return logs.map((log) => renderLoginRow(log));
    }
    return logs.map((log) => renderScanRow(log));
  };

  const topScans = dailyAnalytics.scans.slice(0, 7);
  const topLogins = dailyAnalytics.logins.slice(0, 7);

  const renderDailyCard = (title, description, dataset, renderMeta) => (
    <GlassCard className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-white/60">{description}</p>
        </div>
        {renderMeta ? renderMeta(dataset) : null}
      </div>
      {dataset.length ? (
        <div className="space-y-3">
          {dataset.map((day) => {
            const dateLabel = new Date(day.date).toLocaleDateString();
            const totalValue =
              "authentic_scans" in day
                ? Number(day.total_scans ?? 0)
                : Number(day.total_attempts ?? 0);
            const totalLabel = Number.isFinite(totalValue)
              ? totalValue.toLocaleString()
              : "0";
            return (
              <div
                key={day.date}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/80">
                    {dateLabel}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {totalLabel}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-white/60">
                  {"authentic_scans" in day ? (
                    <>
                      <span className="font-medium text-emerald-200">
                        Authentic {day.authentic_scans ?? 0}
                      </span>
                      <span className="font-medium text-rose-200">
                        Counterfeit {day.counterfeit_scans ?? 0}
                      </span>
                      <span className="font-medium text-amber-200">
                        Suspicious {day.suspicious_scans ?? 0}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-emerald-200">
                        Success {day.successful_logins ?? 0}
                      </span>
                      <span className="font-medium text-rose-200">
                        Failed {day.failed_logins ?? 0}
                      </span>
                      <span className="font-medium text-sky-200">
                        Users {day.unique_users ?? 0}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400"
                    style={{
                      width: `${Math.min(
                        100,
                        "authentic_scans" in day
                          ? ((day.authentic_scans ?? 0) /
                              Math.max(day.total_scans ?? 1, 1)) *
                              100
                          : ((day.successful_logins ?? 0) /
                              Math.max(day.total_attempts ?? 1, 1)) *
                              100
                      ).toFixed(2)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center space-y-2 text-white/50">
          <span className="text-3xl">📉</span>
          <span className="text-sm">No data in this window</span>
        </div>
      )}
    </GlassCard>
  );

  return (
    <AdminShell
      title="Audit Command Center"
      subtitle="Monitor every privileged action, login attempt, and product verification with a unified security signal."
      meta={metaSummary}
      actions={headerActions}
      toolbar={filterToolbar}
    >
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-10">
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
              {card.helper ? (
                <p className="mt-3 text-sm text-white/60">{card.helper}</p>
              ) : null}
            </GlassCard>
          ))}
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          {renderDailyCard(
            `Scan telemetry (${filters.days}d)`,
            "Breakdown of authentic vs counterfeit scans by day.",
            topScans,
            (dataset) => (
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100">
                {dataset
                  .reduce(
                    (sum, item) =>
                      sum + Number(item.total_scans ?? item.total ?? 0),
                    0
                  )
                  .toLocaleString()}{" "}
                total
              </span>
            )
          )}
          {renderDailyCard(
            `Access telemetry (${filters.days}d)`,
            "Success vs failure rates for identity validations.",
            topLogins,
            (dataset) => (
              <span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-100">
                {dataset
                  .reduce(
                    (sum, item) =>
                      sum + Number(item.total_attempts ?? item.total ?? 0),
                    0
                  )
                  .toLocaleString()}{" "}
                attempts
              </span>
            )
          )}
        </section>

        <GlassCard className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {LOG_TYPE_LABELS[logType]}
              </h2>
              <p className="text-sm text-white/60">
                {logs.length.toLocaleString()} records in the current view
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className={`${glassButtonClass} ${
                refreshing ? "cursor-wait opacity-70" : ""
              }`}
              disabled={refreshing}
            >
              {refreshing ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <span className="text-base">⟳</span>
              )}
              <span>{refreshing ? "Refreshing" : "Reload"}</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">{renderTableHeader()}</thead>
              <tbody className="divide-y divide-white/5">{renderRows()}</tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default AuditLogs;
