import SupplierWallet from "./SupplierWallet";
import useRetailerWorkspace from "../../hooks/useRetailerWorkspace";

const retailerCopy = {
  roleLabel: "Retailer",
  workspaceLabel: "Retailer Hub",
  title: "Retailer Wallet",
  subtitle:
    "Link MetaMask to anchor store authenticity events and sync with transparency dashboards.",
  connectSubtitle:
    "Authorize MetaMask so ProductGuard can trace retail custody and verification events on-chain.",
  connectedSubtitle:
    "Store events will sync to HQ transparency dashboards. Keep MetaMask unlocked when signing updates.",
  whyLinkSubtitle:
    "ProductGuard records retail custody on-chain so store teams and HQ share the same source of truth.",
};

const RetailerWallet = () => (
  <SupplierWallet workspaceHook={useRetailerWorkspace} copy={retailerCopy} />
);

export default RetailerWallet;
