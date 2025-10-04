import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  SectionHeader,
  Divider,
  glassButtonClass,
} from "../admin/ui";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";
import useRetailerWorkspace from "../../hooks/useRetailerWorkspace";
import { useConfig } from "../../context/ConfigContext";
import abi from "../../utils/Identeefi.json";
import { findMetaMaskAccount, truncateAddress } from "../../utils/wallet";

const CONTRACT_ABI = abi.abi;

const defaultCopy = {
  roleLabel: "Supplier",
  workspaceLabel: "Supplier Hub",
  title: "Review product before updating",
  subtitle:
    "Confirm on-chain details, check custody trail, and proceed to the update workflow.",
  rescanLabel: "Rescan product",
};

const UpdateProduct = ({ copy: copyOverrides = {} } = {}) => {
  const supplierWorkspace = useSupplierWorkspace();
  const retailerWorkspace = useRetailerWorkspace();

  const activeWorkspace = supplierWorkspace?.isSupplier
    ? {
        ...supplierWorkspace,
        roleLabel: "Supplier",
        workspaceLabel: "Supplier Hub",
        rescanRoute: "/supplier/scanner",
      }
    : retailerWorkspace?.isRetailer
    ? {
        ...retailerWorkspace,
        roleLabel: "Retailer",
        workspaceLabel: "Retailer Hub",
        rescanRoute: "/retailer/scanner",
      }
    : {
        ...supplierWorkspace,
        roleLabel: "Supplier",
        workspaceLabel: "Supplier Hub",
        rescanRoute: "/supplier/scanner",
      };

  const {
    sidebarLinks,
    walletAddress,
    connectWallet,
    checkingWallet,
    isSupplier = false,
    isRetailer = false,
    isCurrentRole = false,
  } = activeWorkspace || {};

  const roleLabel = activeWorkspace?.roleLabel || defaultCopy.roleLabel;
  const roleLower = roleLabel.toLowerCase();
  const copy = useMemo(
    () => ({
      ...defaultCopy,
      ...copyOverrides,
      roleLabel,
    }),
    [copyOverrides, roleLabel]
  );
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
  const workspaceLabel = applyRole(
    activeWorkspace?.workspaceLabel || `${roleLabel} Hub`
  );
  const rescanRoute = activeWorkspace?.rescanRoute || "/supplier/scanner";

  const { apiBaseUrl, contractAddress, publicRpcUrl } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const qrData = location.state?.qrData || "";
  const flaggedSuspicious = Boolean(location.state?.isSuspicious);

  const [currentAccount, setCurrentAccount] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [productDetails, setProductDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isSold, setIsSold] = useState(false);

  useEffect(() => {
    findMetaMaskAccount().then((account) => {
      if (account) {
        setCurrentAccount(account);
      }
    });
  }, []);

  const loadProductImage = useCallback(
    (fileName) => {
      if (!fileName) {
        setImageUrl(null);
        return;
      }
      setImageUrl(`${apiBaseUrl}/file/product/${fileName}`);
    },
    [apiBaseUrl]
  );

  const parseProductData = useCallback(
    (raw) => {
      if (!raw) {
        setLoadError("No product data returned from the blockchain.");
        return;
      }

      const arr = raw.split(",");
      const details = {
        name: arr[1] || "Unknown product",
        brand: arr[2] || "Unknown brand",
        description: (arr[3] || "").replace(/;/g, ","),
        imageKey: arr[4] || "",
      };

      const timeline = [];
      for (let start = 5; start + 4 < arr.length; start += 5) {
        const actor = arr[start + 1] || "";
        const location = (arr[start + 2] || "").replace(/;/g, ",");
        const timestamp = Number(arr[start + 3] || 0);
        const soldFlag = arr[start + 4] === "true";
        timeline.push({
          actor,
          location,
          timestamp,
          isSold: soldFlag,
        });
      }

      const sold = timeline.some((entry) => entry.isSold);
      setProductDetails(details);
      setHistory(timeline);
      setIsSold(sold);
      setLoadError("");
      loadProductImage(details.imageKey);
    },
    [loadProductImage]
  );

  const loadProductFromChain = useCallback(
    async (data) => {
      const parts = data.split(",");
      if (parts.length < 2) {
        setLoadError("QR code is missing expected fields.");
        return;
      }

      const scannedContract = (parts[0] || "").trim();
      const scannedSerial = (parts[1] || "").trim();

      if (!scannedSerial) {
        setLoadError("Serial number missing from QR code.");
        return;
      }

      setSerialNumber(scannedSerial);

      if (!contractAddress) {
        setLoadError("Contract address is not configured.");
        return;
      }

      if (scannedContract !== contractAddress) {
        setLoadError(
          "Scanned QR belongs to a different contract. Please rescan the correct product."
        );
        toast.error("QR code does not match the configured contract.");
        return;
      }

      try {
        setLoadingMessage("Fetching product from Identeefi contract…");
        const provider = window.ethereum
          ? new ethers.providers.Web3Provider(window.ethereum)
          : new ethers.providers.JsonRpcProvider(publicRpcUrl);

        const contract = new ethers.Contract(
          contractAddress,
          CONTRACT_ABI,
          provider
        );

        const response = await contract.getProduct(scannedSerial);
        setLoadingMessage("");
        parseProductData(response.toString());
      } catch (error) {
        console.error("Failed to load product from contract", error);
        setLoadingMessage("");
        setLoadError("Unable to retrieve product data from the blockchain.");
        toast.error("Blockchain lookup failed. Try again or rescan.");
      }
    },
    [contractAddress, parseProductData, publicRpcUrl]
  );

  useEffect(() => {
    if (qrData) {
      loadProductFromChain(qrData);
    }
  }, [qrData, loadProductFromChain]);

  const metaSummary = useMemo(() => {
    return [
      {
        label: "Serial",
        value: serialNumber || "—",
        key: "serial",
      },
      {
        label: "Wallet",
        value: walletAddress ? truncateAddress(walletAddress) : "Not connected",
        key: "wallet",
      },
      {
        label: "Suspicious",
        value: flaggedSuspicious ? "Yes" : "No",
        key: "suspicious",
      },
      {
        label: "Status",
        value: productDetails
          ? isSold
            ? "Marked sold"
            : "In circulation"
          : "Awaiting scan",
        key: "status",
      },
    ];
  }, [serialNumber, walletAddress, flaggedSuspicious, productDetails, isSold]);

  const handleContinue = () => {
    if (!productDetails || !qrData) return;
    navigate("/update-product-details", {
      state: { qrData, isSuspicious: flaggedSuspicious },
    });
  };

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => navigate(rescanRoute)}
        className={glassButtonClass}
      >
        {applyRole(copy.rescanLabel)}
      </button>
      <button
        type="button"
        onClick={connectWallet}
        className={`${glassButtonClass} ${
          checkingWallet ? "cursor-wait opacity-70" : ""
        }`}
        disabled={checkingWallet}
      >
        {checkingWallet
          ? "Connecting…"
          : walletAddress
          ? "Switch wallet"
          : "Connect wallet"}
      </button>
      <button
        type="button"
        onClick={handleContinue}
        disabled={!productDetails || !qrData}
        className={`${glassButtonClass} ${
          !productDetails || !qrData ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        Continue to update
      </button>
    </div>
  );

  return (
    <AdminShell
      title={applyRole(copy.title)}
      subtitle={applyRole(copy.subtitle)}
      meta={metaSummary}
      actions={headerActions}
      forceSidebar={forceSidebar}
      sidebarLinks={sidebarLinks}
      workspaceLabel={forceSidebar ? workspaceLabel : undefined}
      showHeaderNotifications={false}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        {flaggedSuspicious ? (
          <GlassCard className="border-amber-400/40 bg-amber-500/10 p-6 text-white">
            <SectionHeader
              eyebrow="Attention"
              title="Scan flagged as suspicious"
              description="Proceed carefully. Double-check custody data before making changes."
            />
          </GlassCard>
        ) : null}

        {loadError ? (
          <GlassCard className="border-rose-400/40 bg-rose-500/10 p-6 text-white">
            <SectionHeader
              eyebrow="Error"
              title="We couldn't load this product"
              description={loadError}
            />
          </GlassCard>
        ) : null}

        <GradientBorderCard>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative h-48 w-48 overflow-hidden rounded-3xl border border-white/15 bg-white/5">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={productDetails?.name || "Product"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
                    No image
                  </div>
                )}
              </div>
              <div className="text-center text-sm text-white/60">
                Serial number:{" "}
                <span className="font-semibold text-white">
                  {serialNumber || "—"}
                </span>
              </div>
              <div className="text-xs text-white/40">
                Wallet in MetaMask:{" "}
                <span className="font-semibold text-white">
                  {currentAccount ? truncateAddress(currentAccount) : "—"}
                </span>
              </div>
            </div>
            <div className="space-y-5 text-white/80">
              <SectionHeader
                eyebrow="On-chain record"
                title={productDetails?.name || "Unknown product"}
                description="Details pulled directly from the Identeefi smart contract."
              />
              <div className="grid gap-4 text-sm text-white/70 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                    Brand
                  </p>
                  <p className="mt-1 text-base text-white">
                    {productDetails?.brand || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                    Status
                  </p>
                  <p
                    className={`mt-1 text-base ${
                      isSold ? "text-emerald-200" : "text-white"
                    }`}
                  >
                    {isSold ? "Marked sold" : "In circulation"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                    Description
                  </p>
                  <p className="mt-1 text-base text-white">
                    {productDetails?.description || "No description provided."}
                  </p>
                </div>
              </div>
              {loadingMessage ? (
                <div className="text-sm text-white/60">{loadingMessage}</div>
              ) : null}
            </div>
          </div>
        </GradientBorderCard>

        <GlassCard className="p-6 space-y-5">
          <SectionHeader
            eyebrow="Custody trail"
            title="Product history"
            description="Each handoff captured from the smart contract. Review before making changes."
          />
          <Divider />
          {history.length ? (
            <div className="space-y-4">
              {history.map((entry, index) => {
                const timestamp = entry.timestamp
                  ? dayjs(Number(entry.timestamp) * 1000)
                  : null;
                return (
                  <div
                    key={`${entry.actor}-${entry.timestamp}-${index}`}
                    className="rounded-2xl border border-white/12 bg-white/5 p-4 text-sm text-white/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {entry.actor || "Unknown actor"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                          entry.isSold
                            ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                            : "border-white/20 bg-white/10 text-white/70"
                        }`}
                      >
                        {entry.isSold ? "Sold" : "Handled"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-white/60">
                      {entry.location || "Location not provided"}
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      {timestamp
                        ? timestamp.format("MMM D, YYYY h:mm A")
                        : "Timestamp unavailable"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-white/60">
              No history entries found for this product yet.
            </p>
          )}
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default UpdateProduct;
