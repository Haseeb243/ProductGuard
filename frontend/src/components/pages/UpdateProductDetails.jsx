import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import axios from "../../api/axios";
import Geocode from "react-geocode";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  SectionHeader,
  Divider,
  glassButtonClass,
  glassSelectClass,
} from "../admin/ui";
import useSupplierWorkspace from "../../hooks/useSupplierWorkspace";
import useRetailerWorkspace from "../../hooks/useRetailerWorkspace";
import { useConfig } from "../../context/ConfigContext";
import abi from "../../utils/Identeefi.json";
import { buildDescriptiveLocation } from "../../utils/location";
import { findMetaMaskAccount, truncateAddress } from "../../utils/wallet";

const options = ["false", "true"];

const CONTRACT_ABI = abi.abi;

const formatNumber = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString();
};

const MOVEMENT_ROLE_OPTIONS = ["manufacturer", "supplier", "retailer", "admin"];

const MOVEMENT_PRESETS = {
  supplier: {
    receive: {
      from: "manufacturer",
      to: "supplier",
      label: "Receive from manufacturer",
    },
    dispatch: {
      from: "supplier",
      to: "retailer",
      label: "Ship to retailer",
    },
  },
  retailer: {
    receive: {
      from: "supplier",
      to: "retailer",
      label: "Receive from supplier",
    },
    dispatch: {
      from: "retailer",
      to: "admin",
      label: "Return to admin",
    },
  },
};

const ROLE_LABELS = {
  manufacturer: "Manufacturer",
  supplier: "Supplier",
  retailer: "Retailer",
  admin: "Admin",
};

const ROLE_STATUS_DEFAULTS = {
  manufacturer: "in-factory",
  supplier: "received",
  retailer: "in-store",
  admin: "received",
};

const getDefaultStatusForRole = (role) =>
  ROLE_STATUS_DEFAULTS[role] || "in-transit";

const deriveMovementStatus = ({ toRole, presetKey, isSold }) => {
  if (isSold) {
    return "sold";
  }
  if (presetKey === "dispatch") {
    return "in-transit";
  }
  return getDefaultStatusForRole(toRole);
};

const LEDGER_STATUS_COPY = {
  synced: {
    label: "Synced",
    tone: "text-emerald-200",
  },
  stale: {
    label: "Needs review",
    tone: "text-amber-200",
  },
  missing: {
    label: "Unlinked",
    tone: "text-rose-200",
  },
  unknown: {
    label: "Unknown",
    tone: "text-white/70",
  },
};

const resolveLedgerStatus = (status) => {
  const normalized =
    typeof status === "string" ? status.trim().toLowerCase() : "unknown";
  return LEDGER_STATUS_COPY[normalized] || LEDGER_STATUS_COPY.unknown;
};

const UpdateProductDetails = () => {
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
    auth,
    sidebarLinks,
    walletAddress,
    connectWallet,
    checkingWallet,
    isSupplier,
    isRetailer,
    isCurrentRole,
    roleLabel: workspaceRoleLabel,
    workspaceLabel: suppliedWorkspaceLabel,
  } = activeWorkspace;

  const workspaceLabel =
    suppliedWorkspaceLabel || `${workspaceRoleLabel || "Supplier"} Hub`;
  const forceSidebar =
    typeof isCurrentRole === "boolean"
      ? isCurrentRole
      : Boolean(isSupplier || isRetailer);

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
  const [inventorySnapshot, setInventorySnapshot] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [autoMoveEnabled, setAutoMoveEnabled] = useState(true);
  const [movementPreset, setMovementPreset] = useState("receive");
  const [moveFromRole, setMoveFromRole] = useState("");
  const [moveToRole, setMoveToRole] = useState("");
  const [movementQty, setMovementQty] = useState(1);

  const actorRole = useMemo(() => {
    if (auth?.role) {
      return auth.role.toLowerCase();
    }
    if (isSupplier) return "supplier";
    if (isRetailer) return "retailer";
    return "";
  }, [auth?.role, isSupplier, isRetailer]);

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

  useEffect(() => {
    const presets = MOVEMENT_PRESETS[actorRole];
    if (!presets) {
      return;
    }
    const preset = presets[movementPreset] || presets.receive;
    if (!preset) return;
    setMoveFromRole(preset.from);
    setMoveToRole(preset.to);
  }, [actorRole, movementPreset]);

  useEffect(() => {
    if (MOVEMENT_PRESETS[actorRole]) {
      return;
    }
    if (!moveFromRole && inventorySnapshot?.owner_role) {
      setMoveFromRole(inventorySnapshot.owner_role);
    }
    if (!moveToRole && actorRole) {
      setMoveToRole(actorRole);
    }
  }, [actorRole, inventorySnapshot?.owner_role, moveFromRole, moveToRole]);

  useEffect(() => {
    if (!inventorySnapshot?.qty) return;
    setMovementQty((prev) =>
      prev && prev !== 1 ? prev : inventorySnapshot.qty
    );
  }, [inventorySnapshot?.qty]);

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
        toast.error(
          "Location access denied. Enter updates manually if needed."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [resolveLocation]);

  useEffect(() => {
    fetchOperatorProfile();
    captureLocationAndTime();
  }, [fetchOperatorProfile, captureLocationAndTime]);

  useEffect(() => {
    if (!serialNumber) {
      setInventorySnapshot(null);
      setInventoryError("");
      return;
    }
    let cancelled = false;
    setInventoryLoading(true);
    setInventoryError("");
    axios
      .get(`/inventory/${serialNumber}`)
      .then((response) => {
        if (cancelled) return;
        if (response.data?.success && response.data?.item) {
          setInventorySnapshot(response.data.item);
        } else {
          setInventorySnapshot(null);
          setInventoryError("No inventory record found for this serial yet.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setInventorySnapshot(null);
        setInventoryError(
          err.response?.data?.message ||
            "No inventory record synced for this serial yet."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setInventoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [serialNumber]);

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

  const movementPresetsForRole = useMemo(
    () => MOVEMENT_PRESETS[actorRole] || {},
    [actorRole]
  );

  const snapshotLedgerStatus = useMemo(
    () => resolveLedgerStatus(inventorySnapshot?.reconciliation_status),
    [inventorySnapshot?.reconciliation_status]
  );

  const metaSummary = useMemo(() => {
    const summary = [
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

    if (inventorySnapshot?.owner_role) {
      summary.push({
        label: "Inventory owner",
        value:
          ROLE_LABELS[inventorySnapshot.owner_role] ||
          inventorySnapshot.owner_role,
        key: "inventory-owner",
      });
    }

    if (inventorySnapshot) {
      summary.push({
        label: "Ledger",
        value: snapshotLedgerStatus.label,
        key: "ledger-status",
      });
    }

    return summary;
  }, [
    serialNumber,
    walletAddress,
    timestampUnix,
    locationDisplay,
    inventorySnapshot,
    snapshotLedgerStatus,
  ]);

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

  const logInventoryMove = useCallback(async () => {
    if (!autoMoveEnabled) {
      return null;
    }
    if (!moveToRole) {
      throw new Error("Select a destination role for the inventory move.");
    }
    const qtyValue = Number(movementQty) > 0 ? Number(movementQty) : 1;
    const locationValue =
      resolvedLocation ||
      (latitude != null && longitude != null
        ? `lat:${latitude.toFixed(4)};lon:${longitude.toFixed(4)}`
        : undefined);

    const presetLabel =
      movementPresetsForRole[movementPreset]?.label || "manual";

    const derivedStatus = deriveMovementStatus({
      toRole: moveToRole,
      presetKey: movementPreset,
      isSold,
    });

    return axios.post("/inventory/move", {
      serialNumber,
      productName: inventorySnapshot?.product_name || undefined,
      brand: inventorySnapshot?.brand || undefined,
      productImage: inventorySnapshot?.product_image || undefined,
      qty: qtyValue,
      toRole: moveToRole,
      fromRole: moveFromRole || undefined,
      status: derivedStatus,
      location: locationValue,
      metadata: {
        source: "scan-update",
        preset: presetLabel,
        actorRole,
        operatorName,
        captureTimestamp: timestampUnix,
        locationSource,
        flaggedSuspicious,
      },
    });
  }, [
    actorRole,
    autoMoveEnabled,
    flaggedSuspicious,
    isSold,
    inventorySnapshot?.brand,
    inventorySnapshot?.product_image,
    inventorySnapshot?.product_name,
    latitude,
    longitude,
    moveFromRole,
    moveToRole,
    movementPreset,
    movementPresetsForRole,
    movementQty,
    operatorName,
    resolvedLocation,
    serialNumber,
    timestampUnix,
    locationSource,
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
          toast.error(
            "Ownership transfer recorded on-chain but failed in backend."
          );
        }
      }

      if (autoMoveEnabled) {
        try {
          await logInventoryMove();
          toast.success("Inventory move logged in workspace.");
        } catch (moveError) {
          console.error("Auto inventory move failed", moveError);
          toast.error(
            moveError?.message ||
              "Inventory move logging failed. Update saved without ledger move."
          );
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
      forceSidebar={forceSidebar}
      sidebarLinks={sidebarLinks}
      workspaceLabel={forceSidebar ? workspaceLabel : undefined}
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
                {`Logged at ${dayjs(lastSuccessAt).format(
                  "MMM D, YYYY h:mm A"
                )}`}
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
            eyebrow="Inventory snapshot"
            title="Off-chain state"
            description="Quick view of who currently holds this serial and whether it matches on-chain history."
          />
          <div className="mt-6">
            {inventoryLoading ? (
              <div className="flex items-center gap-3 text-white/60">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="text-sm">Loading inventory record…</span>
              </div>
            ) : inventorySnapshot ? (
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  {
                    label: "Owner",
                    value:
                      ROLE_LABELS[inventorySnapshot.owner_role] ||
                      inventorySnapshot.owner_role ||
                      "—",
                  },
                  {
                    label: "Quantity",
                    value: formatNumber(inventorySnapshot.qty),
                  },
                  {
                    label: "Status",
                    value: inventorySnapshot.status || "unknown",
                  },
                  {
                    label: "Ledger",
                    value: snapshotLedgerStatus.label,
                    tone: snapshotLedgerStatus.tone,
                    hint: inventorySnapshot.last_chain_event_at
                      ? `Last chain event ${dayjs(
                          inventorySnapshot.last_chain_event_at
                        ).format("MMM D, YYYY h:mm A")}`
                      : "No on-chain custody recorded",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                      {item.label}
                    </p>
                    <p
                      className={`mt-2 text-base font-semibold ${
                        item.tone || "text-white"
                      }`}
                    >
                      {item.value}
                    </p>
                    {item.hint ? (
                      <p className="text-xs text-white/50">{item.hint}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">
                {inventoryError ||
                  "No inventory entry exists yet. This update will create one once the movement is logged."}
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionHeader
            eyebrow="Ledger automation"
            title="Auto inventory movement"
            description="Automatically log the custody transfer in the admin inventory workspace once this update is submitted."
          />
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Movement sync
                </p>
                <p className="text-xs text-white/60">
                  {autoMoveEnabled
                    ? "Logs the move immediately after this update."
                    : "Disabled for this submission."}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
                <input
                  type="checkbox"
                  checked={autoMoveEnabled}
                  onChange={(event) => setAutoMoveEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-transparent"
                />
                Enable
              </label>
            </div>

            {autoMoveEnabled ? (
              <>
                {Object.keys(movementPresetsForRole).length ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {Object.entries(movementPresetsForRole).map(
                      ([key, preset]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setMovementPreset(key)}
                          className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] transition ${
                            movementPreset === key
                              ? "border-white text-white"
                              : "border-white/20 text-white/50"
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-white/60">
                    No presets for this role—choose custom roles below.
                  </p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                    From role
                    <select
                      value={moveFromRole}
                      onChange={(event) => setMoveFromRole(event.target.value)}
                      className={`${glassSelectClass} mt-2 w-full rounded-2xl px-4 py-2 text-sm`}
                    >
                      <option value="">Select role</option>
                      {MOVEMENT_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role] || role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                    To role
                    <select
                      value={moveToRole}
                      onChange={(event) => setMoveToRole(event.target.value)}
                      className={`${glassSelectClass} mt-2 w-full rounded-2xl px-4 py-2 text-sm`}
                    >
                      <option value="">Select role</option>
                      {MOVEMENT_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role] || role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Quantity
                    <input
                      type="number"
                      min={1}
                      value={movementQty}
                      onChange={(event) =>
                        setMovementQty(
                          Math.max(1, Number(event.target.value) || 1)
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none"
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-white/50">
                  Metadata includes the captured location, timestamp, and preset
                  so analytics stay aligned with this scan.
                </p>
              </>
            ) : null}
          </div>
        </GlassCard>

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
                className={`${glassSelectClass} mt-2 w-full rounded-2xl px-4 py-3 text-sm ${
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
                  Sale handoff is managed by the manufacturer. Supplier updates
                  can’t mark items as sold.
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
                    onChange={(event) => setBuyerIdentifier(event.target.value)}
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
