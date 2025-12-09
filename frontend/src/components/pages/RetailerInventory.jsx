import InventoryWorkspace from "./InventoryWorkspace";
import useRetailerWorkspace from "../../hooks/useRetailerWorkspace";

const RetailerInventory = () => {
  const { sidebarLinks } = useRetailerWorkspace();

  return (
    <InventoryWorkspace
      title="Retailer Inventory"
      subtitle="See every authenticated item on the floor, mark sales, and escalate quarantined stock instantly."
      scopeRole="retailer"
      sidebarLinks={sidebarLinks || undefined}
      workspaceLabel="Retailer Hub"
      forceSidebar
      allowedDestinationRoles={["retailer"]}
    />
  );
};

export default RetailerInventory;
