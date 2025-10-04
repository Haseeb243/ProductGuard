import SupplierScanner from "./SupplierScanner";
import useRetailerWorkspace from "../../hooks/useRetailerWorkspace";

const retailerCopy = {
  roleLabel: "Retailer",
  workspaceLabel: "Retailer Hub",
  shellTitle: "Retailer Scanner",
  shellSubtitle:
    "Verify store inventory, capture QR evidence, and sync authenticity updates with headquarters.",
};

const RetailerScanner = () => (
  <SupplierScanner workspaceHook={useRetailerWorkspace} copy={retailerCopy} />
);

export default RetailerScanner;
