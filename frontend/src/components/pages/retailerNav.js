import {
  DashboardIcon,
  UsersIcon,
  TruckIcon,
  TransparencyIcon,
  SupportIcon,
  ShieldIcon,
  PulseIcon,
  InventoryIcon,
} from "../admin/navigation";
import { WalletIcon } from "./manufacturerNav";

export const buildRetailerSidebarLinks = ({
  walletAddress,
  is2FAEnabled,
  onConnectWallet,
} = {}) => {
  return [
    {
      icon: DashboardIcon,
      label: "Dashboard",
      to: "/retailer",
      tone: "sky",
    },
    {
      icon: UsersIcon,
      label: "Profile",
      to: "/profile",
      tone: "sky",
    },
    {
      icon: PulseIcon,
      label: "Scanner",
      to: "/retailer/scanner",
      tone: "cyan",
    },
    {
      icon: TruckIcon,
      label: "Update Product",
      to: "/update-product",
      tone: "emerald",
    },
    {
      icon: TransparencyIcon,
      label: "Transparency",
      to: "/transparency",
      tone: "cyan",
    },
    {
      icon: InventoryIcon,
      label: "Inventory",
      to: "/retailer/inventory",
      tone: "purple",
    },
    {
      icon: SupportIcon,
      label: "Chat",
      to: "/retailer/chat",
      tone: "slate",
    },
    {
      icon: WalletIcon,
      label: walletAddress ? "Wallet" : "Connect Wallet",
      to: "/retailer/wallet",
      tone: walletAddress ? "emerald" : "rose",
      badge: walletAddress
        ? { label: "Linked", tone: "emerald" }
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

export default buildRetailerSidebarLinks;
