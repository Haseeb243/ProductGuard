import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  SectionHeader,
  glassButtonClass,
} from "../admin/ui";
import useManufacturerWorkspace from "../../hooks/useManufacturerWorkspace";
import { useConfig } from "../../context/ConfigContext";
import axios from "../../api/axios";
import { truncateAddress } from "../../utils/wallet";

const Profile = () => {
  const { auth, sidebarLinks, isManufacturer, walletAddress, connectWallet } =
    useManufacturerWorkspace();
  const { fileEndpoint } = useConfig();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth?.user) return;
      setLoading(true);
      setError("");
      try {
        const response = await axios.get(`/profile/${auth.user}`);
        const row = Array.isArray(response?.data)
          ? response.data[0]
          : response?.data?.data?.[0];
        if (!row) {
          setProfile(null);
          toast.error("Profile not found");
        } else {
          setProfile(row);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load profile data"
        );
        toast.error("Unable to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [auth?.user]);

  const avatarUrl = useMemo(() => {
    const filename = profile?.image || profile?.filepreview;
    if (!filename) return null;
    if (/^https?:/i.test(filename)) return filename;
    try {
      return fileEndpoint("profile", filename.replace(/^\//, ""));
    } catch {
      return filename;
    }
  }, [fileEndpoint, profile?.filepreview, profile?.image]);

  const metaSummary = useMemo(() => {
    return [
      {
        label: "Account",
        value: auth?.user || "Unknown",
        key: "account",
      },
      {
        label: "Role",
        value: profile?.role
          ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
          : "—",
        key: "role",
      },
      {
        label: "Wallet",
        value: walletAddress ? truncateAddress(walletAddress) : "Not connected",
        key: "wallet",
      },
      {
        label: "Updated",
        value: profile?.updated_at
          ? dayjs(profile.updated_at).format("MMM D, YYYY")
          : "—",
        key: "updated",
      },
    ];
  }, [auth?.user, profile?.role, profile?.updated_at, walletAddress]);

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3">
      {walletAddress ? (
        <Link to="/manufacturer-wallet" className={glassButtonClass}>
          Wallet workspace
        </Link>
      ) : (
        <button
          type="button"
          onClick={connectWallet}
          className={`${glassButtonClass} border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-300/60 hover:bg-emerald-500/20`}
        >
          Connect MetaMask
        </button>
      )}
      <Link to="/2fa-settings" className={glassButtonClass}>
        Manage 2FA
      </Link>
    </div>
  );

  return (
    <AdminShell
      title="Manufacturer Profile"
      subtitle="Keep your brand identity and account controls in sync with ProductGuard."
      meta={metaSummary}
      actions={headerActions}
      forceSidebar={isManufacturer}
      sidebarLinks={sidebarLinks}
      workspaceLabel={isManufacturer ? "Manufacturer Workspace" : undefined}
      showHeaderNotifications={false}
      showHeaderProfile={false}
    >
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
        {error ? (
          <GlassCard className="border border-rose-500/40 bg-rose-500/10 text-rose-50">
            <p className="text-sm font-medium">{error}</p>
          </GlassCard>
        ) : null}

        {loading ? (
          <GlassCard className="p-6 text-sm text-white/60">
            Loading profile details…
          </GlassCard>
        ) : null}

        <GlassCard className="p-6">
          <SectionHeader
            title="Profile overview"
            subtitle="Edit profile details via the support team while we finalize the self-service editor."
          />
          <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative h-32 w-32 overflow-hidden rounded-3xl border border-white/15 bg-white/5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile?.name || "Profile avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white/80">
                    {(profile?.name || auth?.user || "?")
                      .toString()
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {profile?.name || "Pending profile"}
                </p>
                <p className="text-sm text-white/60">
                  {profile?.role
                    ? profile.role.charAt(0).toUpperCase() +
                      profile.role.slice(1)
                    : "Manufacturer"}
                </p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Description
                </p>
                <p className="mt-3 text-white/80">
                  {profile?.description || "No description provided yet."}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Website
                </p>
                {profile?.website ? (
                  <a
                    href={
                      profile.website.startsWith("http")
                        ? profile.website
                        : `https://${profile.website}`
                    }
                    className="mt-3 inline-flex items-center text-sm font-semibold text-sky-200 underline decoration-dotted underline-offset-4"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profile.website}
                  </a>
                ) : (
                  <p className="mt-3 text-white/80">No website supplied.</p>
                )}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Location
                </p>
                <p className="mt-3 text-white/80">
                  {profile?.location || "Location details pending."}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Two-factor authentication
                </p>
                <p className="mt-3 text-white/80">
                  {auth?.is2FAEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GradientBorderCard>
          <div className="space-y-6">
            <SectionHeader
              title="Workspace shortcuts"
              subtitle="Hop to other manufacturer tools that rely on your account profile."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <Link
                to="/add-product"
                className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 transition hover:border-white/30 hover:bg-white/10"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Register products
                </p>
                <p className="mt-3">
                  Link new products to the Identeefi contract with on-chain
                  provenance. Your profile details stamp each product with brand
                  metadata.
                </p>
              </Link>
              <Link
                to="/transparency"
                className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 transition hover:border-white/30 hover:bg-white/10"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Transparency dashboard
                </p>
                <p className="mt-3">
                  Investigate cross-ledger reconciliation for serialized goods
                  and ensure ownership events match what you expect in market.
                </p>
              </Link>
            </div>
          </div>
        </GradientBorderCard>
      </div>
    </AdminShell>
  );
};

export default Profile;
