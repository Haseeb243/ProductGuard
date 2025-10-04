import SupplyWorkspaceDashboard from "./SupplyWorkspaceDashboard";
import useRetailerWorkspace from "../../hooks/useRetailerWorkspace";

const retailerCopy = {
  shellTitle: "Retailer Authenticity Deck",
  shellSubtitle:
    "Watch product provenance signals, guide store associates, and sync escalation workflows.",
  workspaceLabel: "Retailer Hub",
  sidebarTitle: "Retailer",
  roleLabel: "Retailer",
  workspaceSlug: "retailer",
  summaryEndpoint: "/retailer/scans-summary",
  quickLinkRoutes: {
    scanner: "/retailer/scanner",
    wallet: "/retailer/wallet",
    chat: "/retailer/chat",
  },
  overviewEyebrow: "Store intelligence",
  overviewTitle: "Retailer scan overview",
  overviewDescription:
    "Track in-store verification momentum, spot product anomalies, and coach teams on next steps.",
  scans30Text: "Across all retail locations in the last month",
  authenticText: "Percentage of scans reconciling with manufacturer provenance",
  suspiciousText:
    "Signals mismatched serials, duplicate wallets, or tampered goods",
  averageText: "Keep store teams focused on consistent authenticity checks",
  quickNavActivity: "Recent store activity",
  quickNavLocations: "Top-performing stores",
  quickNavSupport: "Contact retail support",
  chatButton: "Retailer support",
  locationsTitle: "Storefront scan hotspots",
  locationsEyebrow: "Store spotlight",
  locationsDescription:
    "See which stores or districts are driving verification volume right now.",
  locationsEmpty:
    "No store scans detected in the last 30 days. Encourage associates to verify inventory in receiving.",
  activityTitle: "Latest retailer actions",
  activityEyebrow: "Store timeline",
  activityDescription:
    "Trace the latest catalog edits, transparency downloads, and support escalations from your stores.",
  activityEmpty: "No recent retailer activity logged in the last 30 entries.",
  scansTitle: "Latest authenticity scans",
  scansEyebrow: "Recent verifications",
  scansDescription:
    "Review the most recent QR scans from store teams and jump into affected product records.",
  scansEmpty:
    "No recent scans. Encourage store teams to verify batches at receiving docks.",
  walletEyebrow: "Wallet status",
  walletTitle: "MetaMask connection",
  walletDescription:
    "Link your retail custody wallet to sync on-chain authenticity receipts with headquarters.",
  walletConnectedText: "Transactions sync to retailer transparency dashboards",
  walletDisconnectedText:
    "Connect MetaMask to start anchoring store events on-chain",
  profileEyebrow: "Retail identity",
  profileTitle: "Profile & trust signals",
  profileDescription:
    "Keep your retailer profile current so suppliers recognize your orders instantly.",
  updateEyebrow: "Catalog upkeep",
  updateTitle: "Manage product records",
  updateDescription:
    "Push catalog updates, flag suspicious PO numbers, and attach compliance documents from stores.",
  transparencyEyebrow: "Transparency",
  transparencyTitle: "Customer transparency",
  transparencyDescription:
    "Share provenance proof with customer success teams and surface discrepancies fast.",
};

const Retailer = () => (
  <SupplyWorkspaceDashboard
    workspaceHook={useRetailerWorkspace}
    copy={retailerCopy}
  />
);

export default Retailer;
