import InventoryWorkspace from "./InventoryWorkspace";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";

const SupplierInventory = () => {
  const { sidebarLinks } = useSupplierWorkspace();

  return (
    <InventoryWorkspace
      title="Supplier Inventory"
      subtitle="Confirm custody, annotate transfers, and forward authenticated goods to retail partners."
      scopeRole="supplier"
      sidebarLinks={sidebarLinks || undefined}
      workspaceLabel="Supplier Hub"
      forceSidebar
      allowedDestinationRoles={["supplier", "retailer"]}
    />
  );
};

export default SupplierInventory;
