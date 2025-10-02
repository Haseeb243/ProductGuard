import {
  DashboardIcon,
  UsersIcon,
  FactoryIcon,
  TransparencyIcon,
  SupportIcon,
  ShieldIcon,
} from "../admin/navigation";

export const WalletIcon = ({ className = "h-5 w-5 flex-none" }) => (
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
      d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 12h2a1 1 0 010 2h-2a1 1 0 010-2z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18" />
  </svg>
);

export const buildManufacturerSidebarLinks = ({
  walletAddress,
  is2FAEnabled,
  onConnectWallet,
} = {}) => {
  return [
    {
      icon: DashboardIcon,
      label: "Dashboard",
      to: "/manufacturer",
      tone: "sky",
    },
    {
      icon: UsersIcon,
      label: "Profile",
      to: "/profile",
      tone: "sky",
    },
    {
      icon: FactoryIcon,
      label: "Add Product",
      to: "/add-product",
      tone: "emerald",
    },
    {
      icon: TransparencyIcon,
      label: "Transparency",
      to: "/transparency",
      tone: "cyan",
    },
    {
      icon: SupportIcon,
      label: "Chat",
      to: "/manufacturer-chat",
      tone: "purple",
    },
    {
      icon: WalletIcon,
      label: walletAddress ? "Wallet" : "Connect Wallet",
      to: "/manufacturer-wallet",
      tone: walletAddress ? "emerald" : "rose",
      badge: walletAddress
        ? { label: "Live", tone: "emerald" }
        : { label: "Action", tone: "rose" },
      onClick:
        !walletAddress && typeof onConnectWallet === "function"
          ? onConnectWallet
          : undefined,
    },
    {
      icon: ShieldIcon,
      label: "2FA & Security",
      to: "/2fa-settings",
      tone: is2FAEnabled ? "emerald" : "amber",
      badge: is2FAEnabled
        ? { label: "On", tone: "emerald" }
        : { label: "Off", tone: "rose" },
    },
  ];
};
