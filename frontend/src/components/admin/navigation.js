import { Link, useLocation } from "react-router-dom";
import { badgePillClass } from "./ui";

const baseIconClass = "h-5 w-5 flex-none";

export const DashboardIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13h2v-2H3v2zm4 0h2v-6H7v6zm4 0h2V7h-2v6zm4 0h2v-4h-2v4zm4 0h2v-2h-2v2z"
    />
  </svg>
);

export const FactoryIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 21V9l7-4v4l7-4v16H3z"
    />
  </svg>
);

export const TruckIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17V5a1 1 0 011-1h5a1 1 0 011 1v12m-7 0a2 2 0 104 0m-4 0H5a2 2 0 00-2 2v1a1 1 0 001 1h1a1 1 0 001-1v-1m10 0a2 2 0 104 0m-4 0h2a2 2 0 002-2v-5a1 1 0 00-1-1h-5a1 1 0 00-1 1v5z"
    />
  </svg>
);

export const StoreIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2M16 3a4 4 0 00-8 0v1a4 4 0 01-4 4v2a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4V3z"
    />
  </svg>
);

export const AuditIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export const TransparencyIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
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

export const PulseIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13h3l2-7 4 14 2-7h5"
    />
  </svg>
);

export const SupportIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 13v5a2 2 0 01-2 2H8l-4 4v-6a2 2 0 01-2-2V7a2 2 0 012-2h7"
    />
    <circle cx="19" cy="5" r="3" />
  </svg>
);

export const ShieldIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l7 4v5c0 5-3.582 9.243-7 10-3.418-.757-7-5-7-10V7l7-4z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 12l2 2 4-4" />
  </svg>
);

export const UsersIcon = ({ className = baseIconClass }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"
    />
    <circle cx="9" cy="7" r="4" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M23 20v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
    />
  </svg>
);

const toneIconClasses = {
  sky: "text-sky-300",
  purple: "text-purple-300",
  indigo: "text-indigo-300",
  cyan: "text-cyan-300",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
  amber: "text-amber-300",
  slate: "text-slate-200",
};

const badgeToneClasses = {
  sky: "border-sky-300/40 bg-sky-300/20 text-sky-50",
  purple: "border-purple-400/40 bg-purple-400/20 text-purple-50",
  indigo: "border-indigo-400/40 bg-indigo-400/20 text-indigo-50",
  cyan: "border-cyan-400/40 bg-cyan-400/15 text-cyan-50",
  emerald: "border-emerald-400/40 bg-emerald-400/20 text-emerald-50",
  rose: "border-rose-400/40 bg-rose-400/20 text-rose-50",
  amber: "border-amber-400/40 bg-amber-400/20 text-amber-50",
  slate: "border-white/20 bg-white/10 text-white/80",
};

const getBadgeToneClasses = (tone) =>
  badgeToneClasses[tone] || badgeToneClasses.slate;

export const SIDEBAR_LINKS = [
  {
    icon: DashboardIcon,
    label: "Dashboard",
    to: "/admin",
    tone: "sky",
  },
  {
    icon: PulseIcon,
    label: "Analytics",
    to: "/analytics",
    tone: "purple",
    badge: { label: "Pro", tone: "purple" },
  },
  {
    icon: UsersIcon,
    label: "Manage Accounts",
    to: "/manage-account",
    tone: "slate",
  },
  {
    icon: TransparencyIcon,
    label: "Transparency",
    to: "/transparency",
    tone: "cyan",
  },
  {
    icon: AuditIcon,
    label: "Audit Logs",
    to: "/audit-logs",
    tone: "amber",
  },
  {
    icon: FactoryIcon,
    label: "Manufacturers",
    to: "/manage-account?role=manufacturer",
    tone: "emerald",
  },
  {
    icon: TruckIcon,
    label: "Suppliers",
    to: "/manage-account?role=supplier",
    tone: "rose",
  },
  {
    icon: StoreIcon,
    label: "Retailers",
    to: "/manage-account?role=retailer",
    tone: "indigo",
  },
  {
    icon: SupportIcon,
    label: "Support",
    to: "/support-dashboard",
    tone: "cyan",
    badge: { label: "Live", tone: "sky" },
  },
  {
    icon: ShieldIcon,
    label: "2FA Settings",
    to: "/2fa-settings",
    tone: "emerald",
  },
];

export const SidebarLink = ({
  icon: Icon,
  label,
  to,
  onNavigate,
  tone = "sky",
  badge,
}) => {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const isActive = to.includes("?")
    ? currentPath === to
    : location.pathname === to;
  const iconTone = toneIconClasses[tone] || toneIconClasses.slate;
  const badgeConfig = typeof badge === "string" ? { label: badge } : badge;
  const badgeTone = badgeConfig?.tone || tone;
  const iconClassName = `${baseIconClass} ${
    isActive ? "text-white" : iconTone
  }`;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className="group relative block"
    >
      <div
        className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-sm font-semibold transition duration-200 ${
          isActive
            ? "border-white/25 bg-white/10 text-white shadow-[0_28px_60px_-40px_rgba(96,165,250,0.75)]"
            : "border-transparent text-white/70 hover:border-white/15 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span
          className={`absolute inset-y-2 left-1 w-1 rounded-full bg-gradient-to-b from-white/20 via-white/80 to-white/20 transition ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
          }`}
        />
        <Icon className={iconClassName} />
        <span className="flex-1 leading-tight">{label}</span>
        {badgeConfig ? (
          <span
            className={`${badgePillClass} ml-auto text-[0.65rem] ${getBadgeToneClasses(
              badgeTone
            )}`}
          >
            {badgeConfig.label}
          </span>
        ) : null}
      </div>
    </Link>
  );
};

export default SIDEBAR_LINKS;
