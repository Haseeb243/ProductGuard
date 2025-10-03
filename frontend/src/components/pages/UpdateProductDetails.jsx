import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import axios from "../../api/axios";
import Geocode from "react-geocode";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import AdminShell from "../admin/AdminShell";
import { GlassCard, SectionHeader, Divider, glassButtonClass } from "../admin/ui";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";
import { useConfig } from "../../context/ConfigContext";
import abi from "../../utils/Identeefi.json";
import { buildDescriptiveLocation } from "../../utils/location";
import { findMetaMaskAccount, truncateAddress } from "../../utils/wallet";

const options = ["false", "true"];

const CONTRACT_ABI = abi.abi;

const UpdateProductDetails = () => {
  const {
    auth,
    sidebarLinks,
    isSupplier,
    walletAddress,
    connectWallet,
    checkingWallet,
  } = useSupplierWorkspace();

  const { contractAddress, googleMapsApiKey } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const qrData = location.state?.qrData || "";
  const flaggedSuspicious = Boolean(location.state?.isSuspicious);

  const [currentAccount, setCurrentAccount] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [timestampUnix, setTimestampUnix] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [resolvedLocation, setResolvedLocation] = useState("");
  const [locationSource, setLocationSource] = useState("pending");
  const [geoError, setGeoError] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [isSold, setIsSold] = useState(false);
  useEffect(() => {
    if (isSupplier) {
      setIsSold(false);
    }
  }, [isSupplier]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerIdentifier, setBuyerIdentifier] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSuccessAt, setLastSuccessAt] = useState(null);

  useEffect(() => {
    if (!qrData) return;
    const parts = qrData.split(",");
    if (parts.length > 1) {
      setSerialNumber(parts[1]);
    }
    findMetaMaskAccount().then((account) => {
      if (account) {
        setCurrentAccount(account);
      }
    });
  }, [qrData]);

  const fetchOperatorProfile = useCallback(async () => {
    try {
      if (!auth?.user) return;
      const response = await axios.get(`/profile/${auth.user}`);
      const row = Array.isArray(response?.data)
        ? response.data[0]
        : response?.data?.data?.[0];
      if (row?.name) {
        setOperatorName(row.name);
      }
    } catch (error) {
      console.error("Failed to fetch profile for update:", error);
    }
  }, [auth?.user]);

  const resolveLocation = useCallback(
    async (lat, lon) => {
      if (googleMapsApiKey) {
        try {
          Geocode.setApiKey(googleMapsApiKey);
          const response = await Geocode.fromLatLng(lat, lon);
          const address = response.results?.[0]?.formatted_address;
          if (address) {
            setResolvedLocation(address);
            setLocationSource("google");
            return;
          }
        } catch (error) {
          console.warn("Google reverse geocoding failed:", error);
        }
      }
      try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
          lat
        )}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          const descriptive = buildDescriptiveLocation(data);
          if (descriptive) {
            setResolvedLocation(descriptive);
            setLocationSource("bigdatacloud");
            return;
          }
        }
      } catch (error) {
        console.warn("BigDataCloud reverse geocoding failed:", error);
      }
      setResolvedLocation(`lat:${lat};lon:${lon}`);
      setLocationSource("coordinates");
    },
    [googleMapsApiKey]
  );

  const captureLocationAndTime = useCallback(() => {
    setTimestampUnix(dayjs().unix());
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        setLatitude(lat);
        setLongitude(lon);
        setLocationSource("gps");
        resolveLocation(lat, lon);
      },
      (error) => {
        console.warn("Geolocation error:", error?.message || error);
        setGeoError(
          error?.message ||
            "Unable to access device location. Enable permissions and retry."
        );
        setLocationSource("denied");
        toast.error("Location access denied. Enter updates manually if needed.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [resolveLocation]);

  useEffect(() => {
    fetchOperatorProfile();
    captureLocationAndTime();
  }, [fetchOperatorProfile, captureLocationAndTime]);

  const locationDisplay = useMemo(() => {
    if (resolvedLocation) {
      return resolvedLocation.replace(/;/g, ", ");
    }
    if (geoError) {
      return geoError;
    }
    if (latitude && longitude) {
      return `lat:${latitude.toFixed(4)}, lon:${longitude.toFixed(4)}`;
    }
    return "Capturing location…";
  }, [resolvedLocation, geoError, latitude, longitude]);

  const metaSummary = useMemo(() => {
    return [
      {
        label: "Serial",
        value: serialNumber || "—",
        key: "serial",
      },
      {
        label: "Wallet",
        value: walletAddress
          ? truncateAddress(walletAddress)
          : "Not connected",
        key: "wallet",
      },
      {
        label: "Timestamp",
        value: timestampUnix
          ? dayjs(timestampUnix * 1000).format("MMM D, YYYY h:mm A")
          : "—",
        key: "timestamp",
      },
      {
        label: "Location",
        value: locationDisplay,
        key: "location",
      },
    ];
  }, [serialNumber, walletAddress, timestampUnix, locationDisplay]);

  const updateProductOnChain = useCallback(async () => {
    if (!contractAddress) {
      throw new Error("Contract address is not configured.");
    }
    if (!window.ethereum) {
      throw new Error("MetaMask is required to submit updates.");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const productContract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABI,
      signer
    );

    const locationValue = resolvedLocation
      ? resolvedLocation.replace(/,/g, ";")
      : latitude && longitude
      ? `lat:${latitude};lon:${longitude}`
      : "";

    const registerTxn = await productContract.addProductHistory(
      serialNumber,
      operatorName || auth?.user || "supplier",
      locationValue,
      String(timestampUnix || dayjs().unix()),
      Boolean(isSold)
    );

    setLoadingMessage("Mining transaction…");
    await registerTxn.wait();
    setLoadingMessage("On-chain history updated.");
  }, [
    auth?.user,
    contractAddress,
    isSold,
    latitude,
    longitude,
    operatorName,
    resolvedLocation,
    serialNumber,
    timestampUnix,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (isSold && (!buyerName.trim() || !buyerIdentifier.trim())) {
      setFormError(
        "Please provide the consumer's full name and an identifier before submitting."
      );
      return;
    }

    try {
      setSubmitting(true);
      setLoadingMessage("Preparing transaction…");

      await updateProductOnChain();

      if (isSold) {
        try {
          await axios.post("/ownership/transfer", {
            serialNumber,
            ownerName: buyerName.trim(),
            ownerIdentifier: buyerIdentifier.trim(),
            actor: auth?.user || "supplier",
          });
        } catch (error) {
          console.error("Failed to record consumer ownership:", error);
          toast.error("Ownership transfer recorded on-chain but failed in backend.");
        }
      }

      const successMoment = new Date();
      setLastSuccessAt(successMoment);
      toast.success("Product history updated successfully.");
    } catch (error) {
      console.error("Update product details failed", error);
      toast.error(error?.message || "Failed to update product details.");
    } finally {
      setSubmitting(false);
      setLoadingMessage("");
    }
  };

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className={glassButtonClass}
      >
        Back to review
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
    </div>
  );

  return (
    <AdminShell
      title="Finalize product update"
      subtitle="Anchor this custody event on-chain and optionally record the consumer transfer."
      meta={metaSummary}
      actions={headerActions}
      forceSidebar={isSupplier}
      sidebarLinks={sidebarLinks}
      workspaceLabel={isSupplier ? "Supplier Hub" : undefined}
      showHeaderNotifications={false}
    >
      <div className="mx-auto flex w-full max-w-[1050px] flex-col gap-8">
        {lastSuccessAt ? (
          <GlassCard className="border border-emerald-400/40 bg-emerald-500/10 p-6 text-emerald-50">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-200/80">
                Update acknowledged
              </p>
              <p className="text-base font-semibold">
                Product details were updated successfully.
              </p>
              <p className="text-xs text-emerald-100/80">
                {`Logged at ${dayjs(lastSuccessAt).format("MMM D, YYYY h:mm A")}`}
              </p>
            </div>
          </GlassCard>
        ) : null}

        {flaggedSuspicious ? (
          <GlassCard className="border-amber-400/40 bg-amber-500/10 p-6 text-white">
            <SectionHeader
              eyebrow="Attention"
              title="Previous scan flagged as suspicious"
              description="Ensure the location and operator context are accurate before committing this update."
            />
          </GlassCard>
        ) : null}

        <GlassCard className="p-6">
          <SectionHeader
            eyebrow="On-chain update"
            title="Context for this custody event"
            description="ProductGuard logs the operator, timestamp, and location along with optional sale details."
          />
          <Divider className="my-6" />
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Serial number
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  disabled
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Operator
                </label>
                <input
                  type="text"
                  value={operatorName || auth?.user || ""}
                  disabled
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Timestamp
                </label>
                <input
                  type="text"
                  value={
                    timestampUnix
                      ? dayjs(timestampUnix * 1000).format(
                          "MMMM D, YYYY h:mm A"
                        )
                      : "Capturing timestamp…"
                  }
                  disabled
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Wallet
                </label>
                <input
                  type="text"
                  value={
                    currentAccount
                      ? truncateAddress(currentAccount)
                      : "Not connected"
                  }
                  disabled
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Location
                {locationSource && locationSource !== "pending"
                  ? ` • ${locationSource}`
                  : ""}
              </label>
              <textarea
                value={locationDisplay}
                disabled
                rows={3}
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Mark as sold?
              </label>
              <select
                value={isSold ? "true" : "false"}
                onChange={(event) => {
                  const nextValue = event.target.value === "true";
                  setIsSold(nextValue);
                  if (!nextValue) {
                    setBuyerName("");
                    setBuyerIdentifier("");
                    setFormError("");
                  }
                }}
                disabled={isSupplier}
                className={`mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none ${
                  isSupplier ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {isSupplier ? (
                <p className="mt-2 text-xs text-white/50">
                  Sale handoff is managed by the manufacturer. Supplier updates can’t mark items as sold.
                </p>
              ) : null}
            </div>

            {isSold ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                    Consumer full name
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(event) => setBuyerName(event.target.value)}
                    placeholder="e.g., Jane Doe"
                    className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                    Consumer identifier
                  </label>
                  <input
                    type="text"
                    value={buyerIdentifier}
                    onChange={(event) =>
                      setBuyerIdentifier(event.target.value)
                    }
                    placeholder="Phone / Email / Last 4 of ID"
                    className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            ) : null}

            {loadingMessage ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                {loadingMessage}
              </div>
            ) : null}

            {formError ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className={`${glassButtonClass} ${
                  submitting ? "cursor-wait opacity-70" : ""
                }`}
              >
                {submitting ? "Submitting…" : "Submit update"}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={`${glassButtonClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`}
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default UpdateProductDetails;
