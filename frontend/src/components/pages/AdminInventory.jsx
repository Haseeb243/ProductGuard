import InventoryWorkspace from "./InventoryWorkspace";
import SIDEBAR_LINKS from "../admin/navigation";

const AdminInventory = () => {
  return (
    <InventoryWorkspace
      title="Network Inventory Control"
      subtitle="Monitor every serialized unit, orchestrate handoffs, and keep the ledger in sync with real-world custody."
      scopeRole="admin"
      sidebarLinks={SIDEBAR_LINKS}
      workspaceLabel="Control Tower"
      allowedDestinationRoles={[
        "manufacturer",
        "supplier",
        "retailer",
        "admin",
      ]}
      enableRoleSwitcher
    />
  );
};

export default AdminInventory;
