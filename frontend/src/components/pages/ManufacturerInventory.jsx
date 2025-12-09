import InventoryWorkspace from "./InventoryWorkspace";
import useManufacturerWorkspace from "../../hooks/useManufacturerWorkspace";

const ManufacturerInventory = () => {
  const { sidebarLinks } = useManufacturerWorkspace();

  return (
    <InventoryWorkspace
      title="Manufacturer Inventory"
      subtitle="Track factory stock, stage shipments, and push serialized units downstream in one glass interface."
      scopeRole="manufacturer"
      sidebarLinks={sidebarLinks || undefined}
      workspaceLabel="Manufacturer Hub"
      forceSidebar
      allowedDestinationRoles={["manufacturer", "supplier", "retailer"]}
    />
  );
};

export default ManufacturerInventory;
