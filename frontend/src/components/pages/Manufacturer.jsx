import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  glassButtonClass,
  SectionHeader,
  Divider,
} from "../admin/ui";
import useAuth from "../../hooks/useAuth";
import { buildManufacturerSidebarLinks } from "./manufacturerNav";

const getEthereumObject = () => window.ethereum;

const findMetaMaskAccount = async () => {
  try {
    const ethereum = getEthereumObject();
    if (!ethereum) {
      return null;
    }
    const accounts = await ethereum.request({ method: "eth_accounts" });
    return accounts.length ? accounts[0] : null;
  } catch (error) {
    console.error("Failed to locate MetaMask account", error);
    return null;
  }
};

const formatNumber = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return "0";
  if (Math.abs(number) >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(number) >= 1_000) {
    return `${(number / 1_000).toFixed(1)}K`;
  }
  return number.toLocaleString();
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
};

const shortenAddress = (address = "") => {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

const deriveActivityTone = (action = "") => {
  const normalized = action.toLowerCase();
  if (normalized.includes("add") || normalized.includes("create")) {
    return {
      badge: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
      icon: "+",
    };
  }
  if (normalized.includes("update") || normalized.includes("edit")) {
    return {
      badge: "bg-sky-500/15 text-sky-100 border border-sky-400/30",
      icon: "✎",
    };
  }
  if (normalized.includes("delete") || normalized.includes("remove")) {
    return {
      badge: "bg-rose-500/15 text-rose-200 border border-rose-400/30",
      icon: "−",
    };
  }
  return {
    badge: "bg-white/10 text-white/70 border border-white/20",
    icon: "•",
  };
};

const Manufacturer = () => {
  const { apiBaseUrl } = useConfig();
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const [currentAccount, setCurrentAccount] = useState("");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [productMetrics, setProductMetrics] = useState({
    totalAllTime: 0,
    uniqueAllTime: 0,
    totalRecent: 0,
    uniqueRecent: 0,
    lastAddedAt: null,
    recentProducts: [],
  });
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    findMetaMaskAccount().then((account) => {
      if (account) {
        setCurrentAccount(account);
      }
    });
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      setConnectingWallet(true);
      const ethereum = getEthereumObject();
      if (!ethereum) {
        toast.error("Install MetaMask to connect your wallet.");
        return;
      }
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts?.length) {
        setCurrentAccount(accounts[0]);
        toast.success("Wallet connected");
      }
    } catch (walletError) {
      console.error("Wallet connection failed", walletError);
      toast.error(walletError?.message || "Failed to connect wallet");
    } finally {
      setConnectingWallet(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setCurrentAccount("");
    toast.success("Wallet disconnected locally");
  }, []);

  const loadDashboard = useCallback(
    async ({ showSpinner = true } = {}) => {
      if (!auth?.user) return;
      if (showSpinner) {
        setLoading(true);
      }
      setError(null);

      try {
        const productParams = new URLSearchParams({
          username: auth.user,
          days: "30",
          limit: "20",
        });
        const activityParams = new URLSearchParams({
          username: auth.user,
          limit: "20",
        });

        const [productsRes, activityRes] = await Promise.all([
          fetch(
            `${apiBaseUrl}/manufacturer/products-summary?${productParams.toString()}`
          ),
          fetch(`${apiBaseUrl}/activity-logs?${activityParams.toString()}`),
        ]);

        const productsJson = await productsRes.json().catch(() => null);
        if (!productsRes.ok || !productsJson?.success) {
          throw new Error(
            productsJson?.message || "Unable to load product summary"
          );
        }

        const activityJson = await activityRes.json().catch(() => null);
        if (!activityRes.ok) {
          throw new Error("Unable to load activity log");
        }

        setProductMetrics({
          totalAllTime: productsJson.totalAllTime || 0,
          uniqueAllTime: productsJson.uniqueAllTime || 0,
          totalRecent: productsJson.totalRecent || 0,
          uniqueRecent: productsJson.uniqueRecent || 0,
          lastAddedAt: productsJson.lastAddedAt || null,
          recentProducts: Array.isArray(productsJson.recentProducts)
            ? productsJson.recentProducts
            : [],
        });

        setActivityData(Array.isArray(activityJson) ? activityJson : []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Manufacturer dashboard load failed", err);
        const message = err?.message || "Unable to load dashboard";
        setError(message);
        toast.error(message);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [apiBaseUrl, auth?.user]
  );

  useEffect(() => {
    if (auth?.user) {
      loadDashboard();
    }
  }, [auth?.user, loadDashboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard({ showSpinner: false });
  }, [loadDashboard]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const handleScrollToSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`manufacturer-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const openChatWidget = useCallback(() => {
    const chatFab = document.querySelector('button[aria-label="Open chat"]');
    if (chatFab) {
      chatFab.click();
    } else {
      toast.error("Chat widget is unavailable. Refresh the page to reload it.");
    }
  }, []);

  const sidebarLinks = useMemo(
    () =>
      buildManufacturerSidebarLinks({
        onScrollToSection: handleScrollToSection,
        onConnectWallet: connectWallet,
        walletAddress: currentAccount,
        activeSection,
      }),
    [handleScrollToSection, connectWallet, currentAccount, activeSection]
  );

  const productsAdded30d = useMemo(
    () => Number(productMetrics.totalRecent || 0),
    [productMetrics.totalRecent]
  );
  const totalProducts = useMemo(
    () => Number(productMetrics.totalAllTime || 0),
    [productMetrics.totalAllTime]
  );
  const uniqueProducts30d = useMemo(
    () => Number(productMetrics.uniqueRecent || 0),
    [productMetrics.uniqueRecent]
  );
  const uniqueProductsAllTime = useMemo(
    () => Number(productMetrics.uniqueAllTime || 0),
    [productMetrics.uniqueAllTime]
  );
  const lastProductAt = useMemo(
    () => productMetrics.lastAddedAt || null,
    [productMetrics.lastAddedAt]
  );
  const averageDailyAdds = useMemo(() => {
    if (!productsAdded30d) return "0";
    const average = productsAdded30d / 30;
    return average >= 1 ? average.toFixed(0) : average.toFixed(1);
  }, [productsAdded30d]);
  const recentProducts = useMemo(
    () => productMetrics.recentProducts || [],
    [productMetrics.recentProducts]
  );

  const topBrands = useMemo(() => {
    if (!recentProducts.length) return [];
    const bucket = new Map();
    recentProducts.forEach((item) => {
      const brand = (item?.brand || "Unknown").trim();
      if (!brand) return;
      bucket.set(brand, (bucket.get(brand) || 0) + 1);
    });
    return Array.from(bucket.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([brand, count]) => ({ brand, count }));
  }, [recentProducts]);

  const metaSummary = useMemo(
    () => [
      {
        label: "Wallet",
        value: shortenAddress(currentAccount),
        key: "wallet",
      },
      {
        label: "Products added (30d)",
        value: formatNumber(productsAdded30d),
        key: "products30d",
      },
      {
        label: "Catalog size",
        value: formatNumber(uniqueProductsAllTime),
        key: "catalog",
      },
      {
        label: "Last product",
        value: formatDateTime(lastProductAt),
        key: "last-product",
      },
    ],
    [productsAdded30d, uniqueProductsAllTime, lastProductAt, currentAccount]
  );

  const recentActivity = useMemo(
    () => activityData.slice(0, 6),
    [activityData]
  );

  const recentCatalog = useMemo(
    () => recentProducts.slice(0, 6),
    [recentProducts]
  );

  const quickLinksToolbar = (
    <GlassCard className="w-full" padding="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/profile" className={glassButtonClass}>
          Manage profile
        </Link>
        <Link to="/transparency" className={glassButtonClass}>
          Transparency
        </Link>
        <Link to="/add-product" className={glassButtonClass}>
          Add product
        </Link>
        <Link to="/manufacturer-chat" className={glassButtonClass}>
          Contact support
        </Link>
      </div>
    </GlassCard>
  );

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Link to="/add-product" className={glassButtonClass}>
        + Add product
      </Link>
      <button
        type="button"
        onClick={connectWallet}
        className={`${glassButtonClass} ${
          connectingWallet ? "cursor-wait opacity-70" : ""
        }`}
        disabled={connectingWallet}
      >
        {connectingWallet
          ? "Connecting…"
          : currentAccount
          ? "Switch wallet"
          : "Connect wallet"}
      </button>
      <button
        type="button"
        onClick={handleRefresh}
        className={`${glassButtonClass} ${
          refreshing ? "cursor-wait opacity-70" : ""
        }`}
        disabled={refreshing}
      >
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className={`${glassButtonClass} border-rose-400/40 bg-rose-500/10 hover:border-rose-300/60 hover:bg-rose-500/20`}
      >
        Sign out
      </button>
    </div>
  );

  return (
    <AdminShell
      title="Manufacturer Operations Deck"
      subtitle="Monitor product onboarding, orchestrate provenance, and keep your supply nodes aligned."
      meta={metaSummary}
      actions={headerActions}
      toolbar={quickLinksToolbar}
      sidebarTitle="Manufacturer"
      sidebarLinks={sidebarLinks}
      forceSidebar
      workspaceLabel="Manufacturer Hub"
      showHeaderNotifications={false}
    >
      {error ? (
        <GlassCard className="mx-auto max-w-2xl space-y-4 p-10 text-center text-white">
          <h2 className="text-2xl font-semibold">Dashboard unavailable</h2>
          <p className="text-white/70">{error}</p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRefresh}
              className={`${glassButtonClass} px-6`}
            >
              Retry
            </button>
          </div>
        </GlassCard>
      ) : loading ? (
        <div className="flex h-72 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10">
          <section id="manufacturer-overview">
            <GradientBorderCard className="relative overflow-hidden p-8">
              <span className="pointer-events-none absolute -left-20 top-10 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
              <span className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                    Production guardrail
                  </p>
                  <h2 className="text-3xl font-semibold text-white">
                    Keep every serialized unit verified and traceable
                  </h2>
                  <p className="text-sm text-white/70">
                    Your dashboard blends product registrations, activity
                    trails, and transparency tooling so you can spot catalog
                    gaps before shipments leave the factory floor. Iterate on
                    SKUs, push updates, and keep partners informed without
                    leaving this command center.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                    <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1">
                      Last refresh {formatDateTime(lastUpdated)}
                    </span>
                    <Link
                      to="/add-product"
                      className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:border-white/30 hover:text-white"
                    >
                      Register a product →
                    </Link>
                  </div>
                </div>
                <GlassCard className="w-full max-w-sm space-y-3 border border-white/15 bg-black/40 p-6 text-sm text-white/70 shadow-xl">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
                    <span>Products registered</span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-emerald-100">
                      {formatNumber(totalProducts)}
                    </span>
                  </div>
                  <Divider className="my-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                        New (30d)
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {formatNumber(productsAdded30d)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                        Unique SKUs (30d)
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-white">
                        {formatNumber(uniqueProducts30d)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.35em] text-white/50">
                    Avg daily adds {averageDailyAdds}
                  </p>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Last product {formatDateTime(lastProductAt)}
                  </p>
                </GlassCard>
              </div>
            </GradientBorderCard>
          </section>

          <section
            id="manufacturer-stats"
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
          >
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Products added (30d)
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(productsAdded30d)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                New catalog entries registered over the last 30 days.
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Unique SKUs (30d)
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(uniqueProducts30d)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Distinct serial numbers onboarded in the same window.
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Products registered (lifetime)
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatNumber(totalProducts)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                All add_product events linked to your account.
              </p>
            </GlassCard>
            <GlassCard className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Last product added
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {formatDateTime(lastProductAt)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Timestamp of the most recent catalog addition.
              </p>
            </GlassCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <GlassCard className="p-7" id="manufacturer-profile">
              <SectionHeader
                eyebrow="Your identity"
                title="Profile & trust signals"
                description="Keep your contact details and 2FA posture current so downstream partners can verify provenance instantly."
              />
              <Divider className="my-6" />
              <div className="grid gap-4 text-sm text-white/70 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Username
                  </p>
                  <p className="mt-1 text-base text-white">
                    {auth?.user || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Role
                  </p>
                  <p className="mt-1 text-base text-white">
                    {auth?.role || "manufacturer"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Email
                  </p>
                  <p className="mt-1 break-all text-base text-white">
                    {auth?.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    2FA status
                  </p>
                  <p className="mt-1 text-base text-white">
                    {auth?.is2FAEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/profile" className={glassButtonClass}>
                  Edit profile
                </Link>
                <Link to="/2fa-settings" className={glassButtonClass}>
                  Configure 2FA
                </Link>
              </div>
            </GlassCard>
            <GlassCard className="p-7" id="manufacturer-wallet">
              <SectionHeader
                eyebrow="Wallet access"
                title="MetaMask link"
                description="Connect a wallet to register products on-chain and mint provenance records."
              />
              <Divider className="my-6" />
              <div className="space-y-3 text-sm text-white/70">
                <p>
                  Status:
                  <span className="ml-2 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em]">
                    {currentAccount ? "Connected" : "Disconnected"}
                  </span>
                </p>
                <p>
                  Current account:
                  <span className="ml-2 font-semibold text-white">
                    {shortenAddress(currentAccount)}
                  </span>
                </p>
                <p>
                  Use the same wallet when registering products from the Add
                  Product console to keep on-chain provenance aligned with your
                  dashboard identity.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={connectWallet}
                  className={`${glassButtonClass} ${
                    connectingWallet ? "cursor-wait opacity-70" : ""
                  }`}
                  disabled={connectingWallet}
                >
                  {connectingWallet
                    ? "Connecting…"
                    : currentAccount
                    ? "Switch wallet"
                    : "Connect wallet"}
                </button>
                {currentAccount ? (
                  <button
                    type="button"
                    onClick={disconnectWallet}
                    className={`${glassButtonClass} border-rose-300/40 bg-rose-500/10 hover:border-rose-200/60 hover:bg-rose-500/20`}
                  >
                    Disconnect
                  </button>
                ) : null}
              </div>
            </GlassCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <GlassCard className="p-7">
              <SectionHeader
                eyebrow="Activity trail"
                title="Recent manufacturer actions"
                description="Track the latest updates your team has made across products, transparency, and account security."
              />
              <Divider className="my-6" />
              {recentActivity.length ? (
                <div className="space-y-4">
                  {recentActivity.map((entry, index) => {
                    const tone = deriveActivityTone(entry?.action || "");
                    return (
                      <div
                        key={`${entry?.id || entry?.log_time || index}`}
                        className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/80"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${tone.badge}`}
                          >
                            {tone.icon}
                            <span className="font-semibold tracking-[0.2em]">
                              {entry?.action || "Activity"}
                            </span>
                          </span>
                          <span className="text-xs text-white/50">
                            {formatDateTime(entry?.log_time)}
                          </span>
                        </div>
                        {entry?.details || entry?.metadata ? (
                          <p className="mt-2 text-xs text-white/60">
                            {(typeof entry.metadata === "string" &&
                              entry.metadata) ||
                              (typeof entry.details === "string" &&
                                entry.details) ||
                              ""}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  No recent manufacturer activity in the last 30 days.
                </p>
              )}
            </GlassCard>
            <GlassCard className="p-7">
              <SectionHeader
                eyebrow="Catalog feed"
                title="Recent registrations"
                description="Stay close to the latest products onboarded to ProductGuard."
              />
              <Divider className="my-6" />
              {recentCatalog.length ? (
                <div className="space-y-3">
                  {recentCatalog.map((item, index) => {
                    const displayName =
                      (item?.name && item.name.trim()) ||
                      item?.serialNumber ||
                      "Product";
                    const brand = item?.brand && item.brand.trim();
                    return (
                      <div
                        key={`${
                          item?.serialNumber || item?.registeredAt || index
                        }`}
                        className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/80"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-white">
                            {displayName}
                          </span>
                          <span className="text-xs text-white/50">
                            {formatDateTime(item?.registeredAt)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1">
                            Serial {item?.serialNumber || "—"}
                          </span>
                          {brand ? (
                            <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-sky-100">
                              {brand}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  No products were registered in the last 30 days.
                </p>
              )}
            </GlassCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <GlassCard className="p-7 space-y-6" id="manufacturer-chat">
              <SectionHeader
                eyebrow="Support"
                title="Chat with operations"
                description="Spin up a secure conversation with ProductGuard support when you need policy updates, suspicious scan review, or onboarding help."
              />
              <Divider className="my-4" />
              <p className="text-sm text-white/70">
                Use the floating chat beacon in the lower-right corner to open a
                live thread with our support engineers. Conversations stay
                linked to your manufacturer account so audit history remains
                intact.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleScrollToSection("chat");
                    openChatWidget();
                  }}
                  className={`${glassButtonClass} border-cyan-300/40 bg-cyan-500/10 hover:border-cyan-200/60 hover:bg-cyan-500/20`}
                >
                  Launch chat console
                </button>
                <a
                  href="mailto:support@productguard.io"
                  className={`${glassButtonClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`}
                >
                  Email support
                </a>
              </div>
            </GlassCard>
            <GlassCard className="p-7" id="manufacturer-transparency">
              <SectionHeader
                eyebrow="Transparency"
                title="Catalog insights"
                description="Review the mix of products you've registered and jump into transparency analytics for deeper reconciliation."
              />
              <Divider className="my-6" />
              <div className="space-y-3 text-sm text-white/70">
                <p>Top brands registered:</p>
                {topBrands.length ? (
                  <ul className="space-y-1 pl-4">
                    {topBrands.map((entry) => (
                      <li key={entry.brand} className="list-disc">
                        <span className="font-medium text-white">
                          {entry.brand}
                        </span>
                        <span className="text-white/60">
                          {" "}
                          • {formatNumber(entry.count)} products
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/60">
                    Brand insights will appear after you start registering
                    products.
                  </p>
                )}
                <p>
                  Head to Transparency to download full reconciliation CSVs and
                  align with downstream partners.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/transparency" className={glassButtonClass}>
                  Open transparency
                </Link>
                <Link to="/transparency?serial=" className={glassButtonClass}>
                  Quick lookup
                </Link>
              </div>
            </GlassCard>
          </section>
        </div>
      )}
    </AdminShell>
  );
};

export default Manufacturer;
