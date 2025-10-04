import SupplierChat from "./SupplierChat";
import useRetailerWorkspace from "../../hooks/useRetailerWorkspace";

const retailerCopy = {
  roleLabel: "Retailer",
  workspaceLabel: "Retailer Hub",
  title: "Retailer Support Threads",
  subtitle:
    "Coordinate with ProductGuard support to resolve store authenticity questions and escalations.",
  chatTitle: "Chat with ProductGuard",
  chatSubtitle:
    "Loop in operations when store teams surface anomalies or need guidance on verification workflows.",
};

const RetailerChat = () => (
  <SupplierChat workspaceHook={useRetailerWorkspace} copy={retailerCopy} />
);

export default RetailerChat;
