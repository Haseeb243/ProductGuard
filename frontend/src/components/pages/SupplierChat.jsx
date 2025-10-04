import { useMemo, useCallback } from "react";
import AdminShell from "../admin/AdminShell";
import { GlassCard, SectionHeader } from "../admin/ui";
import LiveChat from "../LiveChat";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";
import { truncateAddress } from "../../utils/wallet";

const defaultCopy = {
  roleLabel: "Supplier",
  workspaceLabel: "Supplier Hub",
  title: "Supplier Support Threads",
  subtitle:
    "Coordinate with ProductGuard specialists and keep distribution issues moving.",
  chatTitle: "Chat with ProductGuard",
  chatSubtitle:
    "Escalate anomalies, confirm verification findings, and get real-time help from our operations crew.",
};

const SupplierChat = ({
  workspaceHook = useSupplierWorkspace,
  copy: copyOverrides = {},
} = {}) => {
  const resolvedHook = workspaceHook || useSupplierWorkspace;
  const workspace = resolvedHook();
  const {
    auth,
    sidebarLinks,
    walletAddress,
    isSupplier = false,
    isRetailer = false,
    isCurrentRole = false,
  } = workspace || {};

  const capitalizedAuthRole = auth?.role
    ? auth.role.charAt(0).toUpperCase() + auth.role.slice(1)
    : null;
  const roleLabel =
    copyOverrides.roleLabel || capitalizedAuthRole || defaultCopy.roleLabel;
  const copy = useMemo(
    () => ({
      ...defaultCopy,
      ...copyOverrides,
      roleLabel,
    }),
    [copyOverrides, roleLabel]
  );
  const roleLower = roleLabel.toLowerCase();
  const applyRole = useCallback(
    (value) => {
      if (typeof value !== "string") return value;
      return value
        .replace(/Supplier/g, roleLabel)
        .replace(/supplier/g, roleLower);
    },
    [roleLabel, roleLower]
  );

  const forceSidebar =
    typeof isCurrentRole === "boolean"
      ? isCurrentRole
      : Boolean(isSupplier || isRetailer);
  const workspaceLabel = applyRole(copy.workspaceLabel || `${roleLabel} Hub`);

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
      title={applyRole(copy.title)}
      subtitle={applyRole(copy.subtitle)}
      meta={metaSummary}
      forceSidebar={forceSidebar}
      sidebarLinks={sidebarLinks}
      workspaceLabel={forceSidebar ? workspaceLabel : undefined}
      showHeaderNotifications={false}
      showHeaderProfile={false}
    >
      <div className="mx-auto flex w-full max-w-[1050px] flex-col gap-8">
        <GlassCard className="p-6">
          <SectionHeader
            title={applyRole(copy.chatTitle)}
            subtitle={applyRole(copy.chatSubtitle)}
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
