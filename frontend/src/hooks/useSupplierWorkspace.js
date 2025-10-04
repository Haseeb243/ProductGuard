import useSupplyWorkspace from "./useSupplyWorkspace";
import { buildSupplierSidebarLinks } from "../components/pages/supplierNav";

const useSupplierWorkspace = () => {
  const workspace = useSupplyWorkspace({
    roleKey: "supplier",
    buildSidebarLinks: buildSupplierSidebarLinks,
  });

  return {
    ...workspace,
    isSupplier: workspace.isCurrentRole,
  };
};

export default useSupplierWorkspace;
