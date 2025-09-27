import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";
import { toast } from "react-toastify";
import logoImg from "../../img/logo.png";
import profilePic from "../../img/profile.jpeg";

// Icons
const DashboardIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13h2v-2H3v2zm4 0h2v-6H7v6zm4 0h2V7h-2v6zm4 0h2v-4h-2v4zm4 0h2v-2h-2v2z"
    />
  </svg>
);

const FactoryIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 21V9l7-4v4l7-4v16H3z"
    />
  </svg>
);

const TruckIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
    />
  </svg>
);

const StoreIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const AuditIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const BellIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-5 5 5 5M6 7l5-5-5-5"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

// Sidebar Link Component
const SidebarLink = ({ icon, label, to, active = false }) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
      active
        ? "bg-blue-600 text-white shadow-lg transform scale-105"
        : "text-gray-300 hover:bg-gray-800 hover:text-white hover:scale-105"
    }`}
  >
    {icon}
    <span className="ml-2">{label}</span>
  </Link>
);

const SIDEBAR_LINKS = [
  { icon: <DashboardIcon />, label: "Dashboard", to: "/admin" },
  {
    icon: <AuditIcon />,
    label: "Audit Logs",
    to: "/audit-logs",
  },
  {
    icon: <FactoryIcon />,
    label: "Manufacturers",
    to: "/manage-account?role=manufacturer",
  },
  {
    icon: <TruckIcon />,
    label: "Suppliers",
    to: "/manage-account?role=supplier",
  },
  {
    icon: <StoreIcon />,
    label: "Retailers",
    to: "/manage-account?role=retailer",
  },
  {
    icon: <DashboardIcon />,
    label: "Support",
    to: "/support-dashboard",
  },
];

const AuditLogs = () => {
  const { apiBaseUrl } = useConfig();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logType, setLogType] = useState("activity");
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filters, setFilters] = useState({
    username: "",
    days: 30,
    success: "",
    isAuthentic: "",
    isSuspicious: "",
    action: "",
    serialNumber: "",
  });

  const [dailyAnalytics, setDailyAnalytics] = useState({
    scans: [],
    logins: [],
  });

  // Map frontend logType to correct backend endpoints
  const getEndpointUrl = (type) => {
    const endpointMap = {
      activity: "activity-logs",
      login: "login-attempts",
      scan: "product-scans",
    };
    return endpointMap[type] || "activity-logs";
  };

  useEffect(() => {
    fetchLogs();
    fetchDailyAnalytics();
  }, [logType, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Build query parameters for filtering
      const params = new URLSearchParams();
      params.append("limit", "100");

      if (filters.username) params.append("username", filters.username);
      if (filters.days) params.append("days", filters.days);

      if (logType === "login") {
        if (filters.success) params.append("success", filters.success);
      } else if (logType === "scan") {
        if (filters.isAuthentic)
          params.append("isAuthentic", filters.isAuthentic);
        if (filters.isSuspicious)
          params.append("isSuspicious", filters.isSuspicious);
        if (filters.serialNumber)
          params.append("serialNumber", filters.serialNumber);
      } else if (logType === "activity") {
        if (filters.action) params.append("action", filters.action);
      }

      const endpoint = getEndpointUrl(logType);
      const res = await fetch(`${apiBaseUrl}/${endpoint}?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error("Failed to load logs:", e);
      toast.error("Failed to load logs: " + e.message);
    }
    setLoading(false);
  };

  const fetchDailyAnalytics = async () => {
    try {
      const [scansRes, loginsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/analytics/scans/daily?days=${filters.days}`),
        fetch(`${apiBaseUrl}/analytics/logins/daily?days=${filters.days}`),
      ]);

      const scansData = scansRes.ok ? await scansRes.json() : { data: [] };
      const loginsData = loginsRes.ok ? await loginsRes.json() : { data: [] };

      setDailyAnalytics({
        scans: scansData.data || [],
        logins: loginsData.data || [],
      });
    } catch (e) {
      console.error("Failed to load daily analytics:", e);
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const endpoint = getEndpointUrl(logType);
      window.open(`${apiBaseUrl}/download-logs/${logType}`, "_blank");
    } catch (e) {
      toast.error("Failed to download logs");
    }
  };

  const clearFilters = () => {
    setFilters({
      username: "",
      days: 30,
      success: "",
      isAuthentic: "",
      isSuspicious: "",
      action: "",
      serialNumber: "",
    });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 bg-gray-900 bg-opacity-80 backdrop-blur-lg border-r border-gray-800 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <img src={logoImg} alt="Logo" className="h-10 w-10 rounded-lg" />
              <h2 className="text-xl font-bold text-white">Identeefi</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-2">
            {SIDEBAR_LINKS.map((link) => (
              <SidebarLink
                key={link.label}
                {...link}
                active={link.to === "/audit-logs"}
              />
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-between px-6 py-3 border-b border-gray-800">
          <div className="flex items-center">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-400 hover:text-white mr-4"
              >
                ☰
              </button>
            )}
            <h1 className="text-2xl font-bold tracking-tight">
              Audit Logs & Analytics
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button className="text-gray-400 hover:text-white">
              <BellIcon />
            </button>
            <img
              src={profilePic}
              className="h-8 w-8 rounded-full border-2 border-gray-700"
              alt="Profile"
            />
            <Link
              to="/login"
              className="text-gray-400 hover:text-red-400 transition ml-2"
            >
              Logout
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-6 space-y-8 text-white">
          <div className="mb-4">
            <p className="text-gray-300">
              Monitor system activity, user logins, and product scans with
              advanced filtering and analytics.
            </p>
          </div>

          {/* Analytics Charts Section */}
          {dailyAnalytics && (
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Scans Chart */}
              <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Daily Scans Trend ({filters.days} days)
                </h3>
                {dailyAnalytics.scans.length > 0 ? (
                  <div className="space-y-3">
                    {dailyAnalytics.scans.slice(0, 7).map((day) => (
                      <div
                        key={day.date}
                        className="bg-gray-800 bg-opacity-50 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300 text-sm font-medium">
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                          <span className="text-blue-400 font-bold">
                            {day.total_scans} total
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">
                            ✓ {day.authentic_scans || 0} authentic
                          </span>
                          <span className="text-red-400">
                            ✗ {day.counterfeit_scans || 0} counterfeit
                          </span>
                          <span className="text-yellow-400">
                            ⚠ {day.suspicious_scans || 0} suspicious
                          </span>
                        </div>
                        <div className="mt-2 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (day.authentic_scans /
                                  Math.max(day.total_scans, 1)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-4xl mb-2">📊</div>
                    <p className="text-gray-500">
                      No scan data available for the selected period
                    </p>
                  </div>
                )}
              </div>

              {/* Daily Logins Chart */}
              <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Daily Login Activity ({filters.days} days)
                </h3>
                {dailyAnalytics.logins.length > 0 ? (
                  <div className="space-y-3">
                    {dailyAnalytics.logins.slice(0, 7).map((day) => (
                      <div
                        key={day.date}
                        className="bg-gray-800 bg-opacity-50 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300 text-sm font-medium">
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                          <span className="text-purple-400 font-bold">
                            {day.total_attempts} attempts
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">
                            ✓ {day.successful_logins || 0} success
                          </span>
                          <span className="text-red-400">
                            ✗ {day.failed_logins || 0} failed
                          </span>
                          <span className="text-blue-400">
                            👥 {day.unique_users || 0} users
                          </span>
                        </div>
                        <div className="mt-2 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-purple-400 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (day.successful_logins /
                                  Math.max(day.total_attempts, 1)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-4xl mb-2">👤</div>
                    <p className="text-gray-500">
                      No login data available for the selected period
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filters Section */}
          <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Log Filters & Controls
              </h3>
              <button
                onClick={clearFilters}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              {/* Log Type Selector */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase font-medium">
                  Log Type
                </label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value)}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-400 focus:outline-none transition-colors"
                >
                  <option value="activity">Activity Logs</option>
                  <option value="login">Login Attempts</option>
                  <option value="scan">Product Scans</option>
                </select>
              </div>

              {/* Username Filter */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase font-medium">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Filter by username"
                  value={filters.username}
                  onChange={(e) =>
                    setFilters({ ...filters, username: e.target.value })
                  }
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Days Filter */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase font-medium">
                  Time Period
                </label>
                <select
                  value={filters.days}
                  onChange={(e) =>
                    setFilters({ ...filters, days: parseInt(e.target.value) })
                  }
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-400 focus:outline-none transition-colors"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>

              {/* Conditional Filters based on log type */}
              {logType === "login" && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase font-medium">
                    Login Status
                  </label>
                  <select
                    value={filters.success}
                    onChange={(e) =>
                      setFilters({ ...filters, success: e.target.value })
                    }
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-400 focus:outline-none transition-colors"
                  >
                    <option value="">All attempts</option>
                    <option value="true">Successful only</option>
                    <option value="false">Failed only</option>
                  </select>
                </div>
              )}

              {logType === "scan" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-medium">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="Serial number"
                      value={filters.serialNumber}
                      onChange={(e) =>
                        setFilters({ ...filters, serialNumber: e.target.value })
                      }
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-400 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase font-medium">
                      Authenticity
                    </label>
                    <select
                      value={filters.isAuthentic}
                      onChange={(e) =>
                        setFilters({ ...filters, isAuthentic: e.target.value })
                      }
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-400 focus:outline-none transition-colors"
                    >
                      <option value="">All scans</option>
                      <option value="true">Authentic only</option>
                      <option value="false">Counterfeit only</option>
                    </select>
                  </div>
                </>
              )}

              {logType === "activity" && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase font-medium">
                    Action Type
                  </label>
                  <select
                    value={filters.action}
                    onChange={(e) =>
                      setFilters({ ...filters, action: e.target.value })
                    }
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-400 focus:outline-none transition-colors"
                  >
                    <option value="">All actions</option>
                    <option value="add_product">Add Product</option>
                    <option value="delete_user">Delete User</option>
                    <option value="login">Login</option>
                    <option value="register">Register</option>
                  </select>
                </div>
              )}

              {/* Download Button */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase font-medium">
                  Export
                </label>
                <button
                  onClick={handleDownloadLogs}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center space-x-2 transition-colors"
                >
                  <DownloadIcon />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.username ||
              filters.success ||
              filters.isAuthentic ||
              filters.action ||
              filters.serialNumber) && (
              <div className="mt-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">
                  Active Filters:
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.username && (
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      User: {filters.username}
                    </span>
                  )}
                  {filters.success && (
                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                      Status:{" "}
                      {filters.success === "true" ? "Success" : "Failed"}
                    </span>
                  )}
                  {filters.isAuthentic && (
                    <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                      Authenticity:{" "}
                      {filters.isAuthentic === "true"
                        ? "Authentic"
                        : "Counterfeit"}
                    </span>
                  )}
                  {filters.action && (
                    <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">
                      Action: {filters.action}
                    </span>
                  )}
                  {filters.serialNumber && (
                    <span className="bg-indigo-600 text-white px-2 py-1 rounded text-xs">
                      Serial: {filters.serialNumber}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logs Table */}
          <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl shadow-lg border border-gray-800">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  {logType === "activity" && "Activity Logs"}
                  {logType === "login" && "Login Attempts"}
                  {logType === "scan" && "Product Scans"}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>Showing {logs.length} records</span>
                  {loading && (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-800 bg-opacity-80">
                  <tr>
                    {logType === "activity" && (
                      <>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Action
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Target
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Details
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Time
                        </th>
                      </>
                    )}
                    {logType === "login" && (
                      <>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Success
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          IP
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Time
                        </th>
                      </>
                    )}
                    {logType === "scan" && (
                      <>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Authentic
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Suspicious
                        </th>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium uppercase text-xs">
                          Time
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-500 py-12"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                          <span>Loading logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-500 py-12"
                      >
                        <div className="text-4xl mb-2">📋</div>
                        <p>No logs found matching your criteria</p>
                        <p className="text-sm mt-1">
                          Try adjusting your filters or time period
                        </p>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {logType === "activity" &&
                        logs.map((log, index) => (
                          <tr
                            key={log.id || index}
                            className="hover:bg-gray-800 transition-colors"
                          >
                            <td className="px-4 py-3 text-white">
                              {log.username}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {log.target}
                            </td>
                            <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                              {log.details}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-sm">
                              {new Date(log.log_time).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      {logType === "login" &&
                        logs.map((log, index) => (
                          <tr
                            key={log.id || index}
                            className="hover:bg-gray-800 transition-colors"
                          >
                            <td className="px-4 py-3 text-white">
                              {log.username}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  log.success
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {log.success ? "Success" : "Failed"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-300 font-mono text-sm">
                              {log.ip_address}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-sm">
                              {new Date(log.attempt_time).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      {logType === "scan" &&
                        logs.map((log, index) => (
                          <tr
                            key={log.id || index}
                            className="hover:bg-gray-800 transition-colors"
                          >
                            <td className="px-4 py-3 text-white font-mono text-sm">
                              {log.serial_number}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {log.username}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {log.location}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  log.is_authentic
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {log.is_authentic ? "Authentic" : "Counterfeit"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {log.is_suspicious && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Suspicious
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-sm">
                              {new Date(log.scan_time).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuditLogs;
