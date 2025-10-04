import { useMemo, useCallback } from "react";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  SectionHeader,
  glassButtonClass,
} from "../admin/ui";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";
import { truncateAddress } from "../../utils/wallet";

const defaultCopy = {
  roleLabel: "Supplier",
  workspaceLabel: "Supplier Hub",
  title: "Supplier Wallet",
  subtitle:
    "Link MetaMask to register custody updates and sync with on-chain provenance.",
  connectSubtitle:
    "Authorize MetaMask so ProductGuard can trace supplier custody and verification events on-chain.",
  connectedSubtitle:
    "Your custody updates will appear in transparency dashboards. Keep MetaMask unlocked when pushing updates.",
  whyLinkSubtitle:
    "ProductGuard records supplier custody on-chain to power transparency experiences.",
};

const SupplierWallet = ({
  workspaceHook = useSupplierWorkspace,
  copy: copyOverrides = {},
} = {}) => {
  const resolvedHook = workspaceHook || useSupplierWorkspace;
  const workspace = resolvedHook();
  const {
    auth,
    sidebarLinks,
    walletAddress,
    checkingWallet,
    connectWallet,
    disconnectWallet,
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
        label: "Wallet",
        value: walletAddress ? truncateAddress(walletAddress) : "Not connected",
        key: "wallet",
      },
      {
        label: "Status",
        value: walletAddress ? "Linked" : "Needs connection",
        key: "status",
      },
    ];
  }, [auth?.user, walletAddress]);

  const primaryCtaLabel = walletAddress
    ? "Disconnect wallet"
    : checkingWallet
    ? "Checking MetaMask…"
    : "Connect MetaMask";

  const handlePrimaryAction = () => {
    if (walletAddress) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  };

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
            title={walletAddress ? "Wallet connected" : "Connect your wallet"}
            subtitle={
              walletAddress
                ? applyRole(copy.connectedSubtitle)
                : applyRole(copy.connectSubtitle)
            }
          />
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 text-sm text-white/70">
              <div>
                <span className="text-white/50">MetaMask status:</span>{" "}
                <span className="font-semibold text-white">
                  {walletAddress ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div>
                <span className="text-white/50">Active account:</span>{" "}
                <span className="font-semibold text-white">
                  {walletAddress ? truncateAddress(walletAddress) : "—"}
                </span>
              </div>
              <div>
                <span className="text-white/50">Environment:</span>{" "}
                <span className="font-semibold text-white">MetaMask / EVM</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePrimaryAction}
              className={`${glassButtonClass} w-full justify-center lg:w-auto`}
              disabled={checkingWallet}
            >
              {primaryCtaLabel}
            </button>
          </div>
        </GlassCard>

        <GradientBorderCard>
          <div className="space-y-6">
            <SectionHeader
              title={applyRole("Why link your wallet?")}
              subtitle={applyRole(copy.whyLinkSubtitle)}
            />
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Custody timeline
                </p>
                <p className="mt-3">
                  MetaMask signatures confirm which supplier handled a product
                  and when, so downstream partners always see the latest custody
                  trace.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Compliance evidence
                </p>
                <p className="mt-3">
                  Blockchain anchors provide tamper-resistant proof for
                  regulators and retailers. Stay audit-ready without juggling
                  spreadsheets.
                </p>
              </div>
            </div>
          </div>
        </GradientBorderCard>
      </div>
    </AdminShell>
  );
};

export default SupplierWallet;
