import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { LinkButton } from "../LinkButton";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import logoImg from "../../img/logo.png";
import profilePic from "../../img/profile.jpeg";
import { useConfig } from "../../context/ConfigContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
// Real SVG icons
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
      d="M9 17V5a1 1 0 011-1h5a1 1 0 011 1v12m-7 0a2 2 0 104 0m-4 0H5a2 2 0 00-2 2v1a1 1 0 001 1h1a1 1 0 001-1v-1m10 0a2 2 0 104 0m-4 0h2a2 2 0 002-2v-5a1 1 0 00-1-1h-5a1 1 0 00-1 1v5z"
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
      d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2M16 3a4 4 0 00-8 0v1a4 4 0 01-4 4v2a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4V3z"
    />
  </svg>
);
const BellIcon = () => (
  <span className="inline-block w-5 h-5 bg-gray-400 rounded-full" />
);
const DownloadIcon = () => (
  <span className="inline-block w-4 h-4 bg-blue-400 rounded mr-1" />
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

const SidebarLink = ({ icon, label, to, active }) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-2 rounded-lg text-gray-200 hover:bg-gray-800 hover:text-white transition ${
      active ? "bg-gray-800" : ""
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

const Admin = () => {
  const { apiBaseUrl } = useConfig();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteUser, setDeleteUser] = useState("");
  const [recentActivity, setRecentActivity] = useState([]);
  const [dashboardAnalytics, setDashboardAnalytics] = useState({
    scans: [],
    logins: [],
    activitySummary: [],
  });

  useEffect(() => {
    fetchAnalytics();
    fetchRecentActivity();
    fetchDashboardAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/dashboard-analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      toast.error("Failed to load analytics");
    }
    setLoading(false);
  };

  const fetchRecentActivity = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/activity-logs?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data);
      }
    } catch (e) {
      console.error("Failed to load recent activity:", e);
    }
  };

  const fetchDashboardAnalytics = async () => {
    try {
      const [scansRes, loginsRes, activityRes] = await Promise.all([
        fetch(`${apiBaseUrl}/analytics/scans/daily?days=7`),
        fetch(`${apiBaseUrl}/analytics/logins/daily?days=7`),
        fetch(`${apiBaseUrl}/analytics/activity/summary?days=7`),
      ]);

      const [scansData, loginsData, activityData] = await Promise.all([
        scansRes.ok ? scansRes.json() : { data: [] },
        loginsRes.ok ? loginsRes.json() : { data: [] },
        activityRes.ok ? activityRes.json() : { data: [] },
      ]);

      setDashboardAnalytics({
        scans: scansData.data || [],
        logins: loginsData.data || [],
        activitySummary: activityData.data || [],
      });
    } catch (e) {
      console.error("Failed to load dashboard analytics:", e);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch(`${apiBaseUrl}/delete-user/${deleteUser}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("User deleted");
        setDeleteUser("");
        fetchAnalytics();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error("Failed to delete user");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800 sticky top-0 min-h-screen">
        <div className="flex items-center justify-center h-16 border-b border-gray-800">
          <img src={logoImg} alt="ProductGuard" className="h-10" />
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2">
          {SIDEBAR_LINKS.map((link) => (
            <SidebarLink
              key={link.label}
              {...link}
              active={link.to === "/admin"}
            />
          ))}
        </nav>
      </aside>
      {/* Mobile Sidebar Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-900 p-2 rounded"
        onClick={() => setSidebarOpen((v) => !v)}
      >
        <span className="text-white">☰</span>
      </button>
      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col md:hidden">
          <div className="flex items-center justify-between h-16 border-b border-gray-800 px-4">
            <img src="../../img/logo.png" alt="ProductGuard" className="h-10" />
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
                active={link.to === "/admin"}
              />
            ))}
          </nav>
        </aside>
      )}
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-gray-900 bg-opacity-80 backdrop-blur-lg flex items-center justify-between px-6 py-3 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
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
        {/* KPI Cards */}
        <main className="flex-1 p-6 space-y-8">
          {/* Dashboard Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl shadow-lg p-6 flex items-center bg-gradient-to-tr from-blue-400/80 to-indigo-600/80 backdrop-blur-lg border border-white/10">
              <PersonAddAltIcon
                sx={{
                  fontSize: 40,
                  color: "#fff",
                  mr: 2,
                  filter: "drop-shadow(0 2px 8px #6366f1)",
                }}
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Add Account
                </h2>
                <p className="text-white/80 mb-4">
                  Create a new user account for manufacturer, supplier, or
                  retailer.
                </p>
                <LinkButton
                  to="/add-account"
                  buttonStyle="long"
                  buttonSize="large"
                >
                  Add Account
                </LinkButton>
              </div>
            </div>
            <div className="rounded-2xl shadow-lg p-6 flex items-center bg-gradient-to-tr from-indigo-500/80 to-blue-300/80 backdrop-blur-lg border border-white/10">
              <ManageAccountsIcon
                sx={{
                  fontSize: 40,
                  color: "#fff",
                  mr: 2,
                  filter: "drop-shadow(0 2px 8px #38bdf8)",
                }}
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Manage Accounts
                </h2>
                <p className="text-white/80 mb-4">
                  View, edit, or remove user accounts in the system.
                </p>
                <LinkButton
                  to="/manage-account"
                  buttonStyle="long"
                  buttonSize="large"
                >
                  Manage Accounts
                </LinkButton>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <span className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full"></span>
            </div>
          ) : (
            analytics && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white">
                    Total Users
                  </h3>
                  <p className="text-3xl font-bold text-blue-400">
                    {analytics.userCounts.reduce(
                      (acc, cur) => acc + parseInt(cur.count || 0),
                      0
                    )}
                  </p>
                </div>
                <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white">
                    Total Products
                  </h3>
                  <p className="text-3xl font-bold text-green-400">
                    {analytics.productCount || 0}
                  </p>
                </div>
                <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white">
                    Total Scans
                  </h3>
                  <p className="text-3xl font-bold text-yellow-400">
                    {analytics.scanCount || 0}
                  </p>
                </div>
                <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white">
                    Authentic Scans
                  </h3>
                  <p className="text-3xl font-bold text-cyan-400">
                    {analytics.authenticScanCount || 0}
                  </p>
                </div>
                <div className="bg-gray-800 bg-opacity-60 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white">
                    Counterfeit Detected
                  </h3>
                  <p className="text-3xl font-bold text-red-400">
                    {analytics.counterfeitScanCount || 0}
                  </p>
                </div>
              </div>
            )
          )}

          {/* Pie Charts Section */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Scan Authenticity Pie Chart */}
              <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Scan Results Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Authentic",
                            value: analytics.authenticScanCount || 0,
                            color: "#10B981",
                          },
                          {
                            name: "Counterfeit",
                            value: analytics.counterfeitScanCount || 0,
                            color: "#EF4444",
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #374151",
                          borderRadius: "0.5rem",
                          color: "#F9FAFB",
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          color: "#F9FAFB",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* User Activity Pie Chart */}
              <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">
                  User Types Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.userCounts.map((user) => ({
                          name:
                            user.role.charAt(0).toUpperCase() +
                            user.role.slice(1),
                          value: parseInt(user.count || 0),
                          color:
                            user.role === "admin"
                              ? "#8B5CF6"
                              : user.role === "manufacturer"
                              ? "#F59E0B"
                              : user.role === "distributor"
                              ? "#06B6D4"
                              : "#10B981",
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.userCounts.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.role === "admin"
                                ? "#8B5CF6"
                                : entry.role === "manufacturer"
                                ? "#F59E0B"
                                : entry.role === "distributor"
                                ? "#06B6D4"
                                : "#10B981"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #374151",
                          borderRadius: "0.5rem",
                          color: "#F9FAFB",
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          color: "#F9FAFB",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Dashboard Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Weekly Scan Trends */}
            <div className="lg:col-span-2 bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                Weekly Scan Activity
              </h3>
              {dashboardAnalytics.scans.length > 0 ? (
                <div className="space-y-4">
                  {dashboardAnalytics.scans.map((day, index) => {
                    const total = day.total_scans || 0;
                    const authentic = day.authentic_scans || 0;
                    const counterfeit = day.counterfeit_scans || 0;
                    const authenticPercent =
                      total > 0 ? (authentic / total) * 100 : 0;

                    return (
                      <div
                        key={day.date}
                        className="bg-gray-800 bg-opacity-50 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-white font-medium">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-blue-400 font-bold">
                            {total} scans
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-green-400">
                            ✓ {authentic} authentic
                          </span>
                          <span className="text-red-400">
                            ✗ {counterfeit} counterfeit
                          </span>
                          <span className="text-purple-400">
                            {authenticPercent.toFixed(1)}% success
                          </span>
                        </div>
                        <div className="relative bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${authenticPercent}%` }}
                          />
                          <div
                            className="absolute top-0 right-0 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${100 - authenticPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-5xl mb-3">📊</div>
                  <p className="text-gray-400">No scan data available</p>
                </div>
              )}
            </div>

            {/* Recent Activity Panel */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Activity
              </h3>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={activity.id || index}
                      className="bg-gray-800 bg-opacity-50 rounded-lg p-3"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {activity.action === "add_product" && (
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">+</span>
                            </div>
                          )}
                          {activity.action === "delete_user" && (
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">-</span>
                            </div>
                          )}
                          {activity.action === "login" && (
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">👤</span>
                            </div>
                          )}
                          {!["add_product", "delete_user", "login"].includes(
                            activity.action
                          ) && (
                            <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">•</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {activity.username}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {activity.action.replace("_", " ")} •{" "}
                            {activity.target}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(activity.log_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-3xl mb-2">📝</div>
                  <p className="text-gray-400 text-sm">No recent activity</p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <Link
                  to="/audit-logs"
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  View all logs →
                </Link>
              </div>
            </div>
          </div>

          {/* Activity Summary & Login Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Activity Summary */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                Top Activities (7 days)
              </h3>
              {dashboardAnalytics.activitySummary.length > 0 ? (
                <div className="space-y-3">
                  {dashboardAnalytics.activitySummary
                    .slice(0, 5)
                    .map((activity, index) => (
                      <div
                        key={activity.action}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              index === 0
                                ? "bg-yellow-400"
                                : index === 1
                                ? "bg-green-400"
                                : index === 2
                                ? "bg-blue-400"
                                : "bg-gray-400"
                            }`}
                          />
                          <span className="text-white text-sm capitalize">
                            {activity.action.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-sm">
                            {activity.action_count} times
                          </span>
                          <span className="text-gray-500 text-xs">
                            ({activity.unique_users} users)
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No activity data available
                </p>
              )}
            </div>

            {/* Login Success Rate */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                Login Success Rate (7 days)
              </h3>
              {dashboardAnalytics.logins.length > 0 ? (
                <div className="space-y-4">
                  {dashboardAnalytics.logins.map((day) => {
                    const total = day.total_attempts || 0;
                    const successful = day.successful_logins || 0;
                    const successRate =
                      total > 0 ? (successful / total) * 100 : 0;

                    return (
                      <div
                        key={day.date}
                        className="bg-gray-800 bg-opacity-50 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300 text-sm">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              successRate > 90
                                ? "text-green-400"
                                : successRate > 70
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {successRate.toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>{successful} successful</span>
                          <span>{total - successful} failed</span>
                        </div>
                        <div className="bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              successRate > 90
                                ? "bg-green-400"
                                : successRate > 70
                                ? "bg-yellow-400"
                                : "bg-red-400"
                            }`}
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No login data available
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-800 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link
                to="/audit-logs"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <AuditIcon />
                <span>View Audit Logs</span>
              </Link>
              <Link
                to="/add-account"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <span>➕</span>
                <span>Add Account</span>
              </Link>
              <Link
                to="/manage-account"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <span>👥</span>
                <span>Manage Users</span>
              </Link>
              <Link
                to="/support-dashboard"
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <span>💬</span>
                <span>Support</span>
              </Link>
            </div>
          </div>

          <Toaster
            position="top-right"
            toastOptions={{ className: "bg-gray-800 text-white" }}
          />
        </main>
      </div>
    </div>
  );
};

export default Admin;
