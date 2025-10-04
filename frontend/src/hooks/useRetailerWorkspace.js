import useSupplyWorkspace from "./useSupplyWorkspace";
import { buildRetailerSidebarLinks } from "../components/pages/retailerNav";

const useRetailerWorkspace = () => {
  const workspace = useSupplyWorkspace({
    roleKey: "retailer",
    buildSidebarLinks: buildRetailerSidebarLinks,
  });

  return {
    ...workspace,
    isRetailer: workspace.isCurrentRole,
  };
};

export default useRetailerWorkspace;
