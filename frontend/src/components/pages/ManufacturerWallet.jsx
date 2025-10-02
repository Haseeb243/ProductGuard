import { useMemo } from "react";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  SectionHeader,
  glassButtonClass,
} from "../admin/ui";
import useManufacturerWorkspace from "../../hooks/useManufacturerWorkspace";
import { truncateAddress } from "../../utils/wallet";

const ManufacturerWallet = () => {
  const {
    auth,
    sidebarLinks,
    isManufacturer,
    walletAddress,
    checkingWallet,
    connectWallet,
    disconnectWallet,
  } = useManufacturerWorkspace();

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
        value: walletAddress ? "Ready" : "Needs connection",
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
      title="Wallet Connections"
      subtitle="Link your MetaMask account to register products on-chain and manage custody events."
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
            title={walletAddress ? "Wallet connected" : "Connect your wallet"}
            subtitle={
              walletAddress
                ? "You're ready to sign ProductGuard smart contract transactions. Keep MetaMask unlocked while registering products."
                : "Authorize MetaMask access so ProductGuard can register product provenance to the blockchain."
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
              title="How ProductGuard uses your wallet"
              subtitle="MetaMask signs transactions that anchor provenance events to the Identeefi smart contract."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Product registration
                </p>
                <p className="mt-3">
                  Each product you add is immutably registered on-chain. Your
                  connected account signs the transaction and the resulting hash
                  is stored alongside the off-chain product record.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Ownership updates
                </p>
                <p className="mt-3">
                  Maintain provenance integrity by using the same wallet when
                  updating custody or ownership transfers. ProductGuard
                  reconciles these events in the transparency dashboard.
                </p>
              </div>
            </div>
          </div>
        </GradientBorderCard>
      </div>
    </AdminShell>
  );
};

export default ManufacturerWallet;
