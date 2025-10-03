import { useMemo } from "react";
import AdminShell from "../admin/AdminShell";
import { GlassCard, SectionHeader } from "../admin/ui";
import LiveChat from "../LiveChat";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";
import { truncateAddress } from "../../utils/wallet";

const SupplierChat = () => {
  const { auth, sidebarLinks, isSupplier, walletAddress } =
    useSupplierWorkspace();

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
        value: walletAddress
          ? truncateAddress(walletAddress)
          : "Not connected",
        key: "wallet",
      },
    ];
  }, [auth?.role, auth?.user, walletAddress]);

  return (
    <AdminShell
      title="Supplier Support Threads"
      subtitle="Coordinate with ProductGuard specialists and keep distribution issues moving."
      meta={metaSummary}
      forceSidebar={isSupplier}
      sidebarLinks={sidebarLinks}
      workspaceLabel={isSupplier ? "Supplier Hub" : undefined}
      showHeaderNotifications={false}
      showHeaderProfile={false}
    >
      <div className="mx-auto flex w-full max-w-[1050px] flex-col gap-8">
        <GlassCard className="p-6">
          <SectionHeader
            title="Chat with ProductGuard"
            subtitle="Escalate anomalies, confirm verification findings, and get real-time help from our operations crew."
          />
          <div className="mt-6">
            <LiveChat user={{ username: auth?.user, role: auth?.role }} />
          </div>
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default SupplierChat;
