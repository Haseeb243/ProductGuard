import { Link, useLocation } from "react-router-dom";

const iconClasses = "w-5 h-5 mr-2";

export const DashboardIcon = () => (
  <svg
    className={iconClasses}
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

export const FactoryIcon = () => (
  <svg
    className={iconClasses}
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

export const TruckIcon = () => (
  <svg
    className={iconClasses}
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

export const StoreIcon = () => (
  <svg
    className={iconClasses}
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

export const AuditIcon = () => (
  <svg
    className={iconClasses}
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

export const TransparencyIcon = () => (
  <svg
    className={iconClasses}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9L12 3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 7.5l5.5 3v3l-5.5 3-5.5-3v-3l5.5-3z"
    />
  </svg>
);

export const PulseIcon = () => (
  <svg
    className={iconClasses}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13h3l2-7 4 14 2-7h5"
    />
  </svg>
);

export const SIDEBAR_LINKS = [
  { icon: <DashboardIcon />, label: "Dashboard", to: "/admin" },
  { icon: <PulseIcon />, label: "Analytics", to: "/analytics" },
  { icon: <TransparencyIcon />, label: "Transparency", to: "/transparency" },
  { icon: <AuditIcon />, label: "Audit Logs", to: "/audit-logs" },
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
  { icon: <DashboardIcon />, label: "Support", to: "/support-dashboard" },
  { icon: <DashboardIcon />, label: "2FA Settings", to: "/2fa-settings" },
];

export const SidebarLink = ({ icon, label, to, onNavigate }) => {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const active = to.includes("?")
    ? currentPath === to
    : location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center px-4 py-2 rounded-lg text-gray-200 hover:bg-gray-800 hover:text-white transition ${
        active ? "bg-gray-800 text-white" : ""
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </Link>
  );
};

export default SIDEBAR_LINKS;
