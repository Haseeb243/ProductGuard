import SupplyWorkspaceDashboard from "./SupplyWorkspaceDashboard";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";

const Supplier = () => (
  <SupplyWorkspaceDashboard workspaceHook={useSupplierWorkspace} />
);

export default Supplier;
