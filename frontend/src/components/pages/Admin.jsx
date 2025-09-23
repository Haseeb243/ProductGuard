import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { LinkButton } from "../LinkButton";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import logoImg from "../../img/logo.png";
import profilePic from "../../img/profile.jpeg";
import { useConfig } from "../../context/ConfigContext";
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
];

const Admin = () => {
  const { apiBaseUrl } = useConfig();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logType, setLogType] = useState("activity");
  const [loading, setLoading] = useState(true);
  const [deleteUser, setDeleteUser] = useState("");

  useEffect(() => {
    fetchAnalytics();
    fetchLogs();
  }, [logType]);

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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/${logType}-logs`);
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      toast.error("Failed to load logs");
    }
    setLoading(false);
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

  const handleDownloadLogs = async () => {
    try {
      window.open(`${apiBaseUrl}/download-logs/${logType}`, "_blank");
    } catch (e) {
      toast.error("Failed to download logs");
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
          {/* Logs Table */}
          <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-xl shadow-lg border border-gray-800 overflow-x-auto mt-8">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-gray-800 bg-opacity-80">
                <tr>
                  {logType === "activity" && (
                    <>
                      <th className="px-4 py-2 text-left text-gray-400">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Action
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Target
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Details
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Time
                      </th>
                    </>
                  )}
                  {logType === "login" && (
                    <>
                      <th className="px-4 py-2 text-left text-gray-400">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Success
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">IP</th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Time
                      </th>
                    </>
                  )}
                  {logType === "scan" && (
                    <>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Product
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Location
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Authentic
                      </th>
                      <th className="px-4 py-2 text-left text-gray-400">
                        Time
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 py-8">
                      No logs found.
                    </td>
                  </tr>
                )}
                {logType === "activity" &&
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800 transition">
                      <td className="px-4 py-2">{log.username}</td>
                      <td className="px-4 py-2">{log.action}</td>
                      <td className="px-4 py-2">{log.target}</td>
                      <td className="px-4 py-2">{log.details}</td>
                      <td className="px-4 py-2">{log.log_time}</td>
                    </tr>
                  ))}
                {logType === "login" &&
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800 transition">
                      <td className="px-4 py-2">{log.username}</td>
                      <td className="px-4 py-2">
                        {log.success ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-2">{log.ip_address}</td>
                      <td className="px-4 py-2">{log.attempt_time}</td>
                    </tr>
                  ))}
                {logType === "scan" &&
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800 transition">
                      <td className="px-4 py-2">{log.serial_number}</td>
                      <td className="px-4 py-2">{log.username}</td>
                      <td className="px-4 py-2">{log.location}</td>
                      <td className="px-4 py-2">
                        {log.is_authentic ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-2">{log.scan_time}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
