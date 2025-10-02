import { useMemo } from "react";
import AdminShell from "../admin/AdminShell";
import { GlassCard, SectionHeader } from "../admin/ui";
import LiveChat from "../LiveChat";
import useManufacturerWorkspace from "../../hooks/useManufacturerWorkspace";
import { truncateAddress } from "../../utils/wallet";

const ManufacturerChat = () => {
  const { auth, sidebarLinks, isManufacturer, walletAddress } =
    useManufacturerWorkspace();

  const metaSummary = useMemo(() => {
    return [
      {
        label: "Account",
        value: auth?.user || "Unknown",
        key: "account",
      },
      {
        label: "Role",
        value: auth?.role
          ? auth.role.charAt(0).toUpperCase() + auth.role.slice(1)
          : "—",
        key: "role",
      },
      {
        label: "Wallet",
        value: walletAddress ? truncateAddress(walletAddress) : "Not connected",
        key: "wallet",
      },
    ];
  }, [auth?.role, auth?.user, walletAddress]);

  return (
    <AdminShell
      title="Support Conversations"
      subtitle="Collaborate with ProductGuard support engineers in real time."
      meta={metaSummary}
      forceSidebar={isManufacturer}
      sidebarLinks={sidebarLinks}
      workspaceLabel={isManufacturer ? "Manufacturer Workspace" : undefined}
      showHeaderNotifications={false}
      showHeaderProfile={false}
    >
      <div className="mx-auto flex w-full max-w-[1050px] flex-col gap-8">
        <GlassCard className="p-6">
          <SectionHeader
            title="Direct channel to ProductGuard"
            subtitle="Share context, escalate incidents, and coordinate supply chain investigations with our specialists."
          />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr]">
            <LiveChat user={{ username: auth?.user, role: auth?.role }} />
          </div>
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default ManufacturerChat;
