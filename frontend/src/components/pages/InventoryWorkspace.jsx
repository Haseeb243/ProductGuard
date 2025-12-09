import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import axios from "../../api/axios";
import { toast } from "react-hot-toast";
import AdminShell from "../admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  glassButtonClass,
  glassSelectClass,
} from "../admin/ui";
import useAuth from "../../hooks/useAuth";
import { useConfig } from "../../context/ConfigContext";

const ROLE_LABELS = {
  admin: "Admin",
  manufacturer: "Manufacturer",
  supplier: "Supplier",
  retailer: "Retailer",
};

const ROLE_STATUS_DEFAULTS = {
  manufacturer: "in-factory",
  supplier: "received",
  retailer: "in-store",
  admin: "received",
};

const getDefaultStatusForRole = (role) =>
  ROLE_STATUS_DEFAULTS[role] || "in-transit";

const parseMoveMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === "object") {
    return metadata;
  }
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
};

const isManufacturingIntakeMove = (move) => {
  if (!move) return false;
  const metadata = parseMoveMetadata(move.metadata);
  if (metadata?.source === "manufacturer-add") {
    return true;
  }
  if (!move.from_owner_role) {
    const notes = (move.notes || "").toLowerCase();
    if (notes.includes("manufactur")) {
      return true;
    }
  }
  return false;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "in-factory", label: "In factory" },
  { value: "in-transit", label: "In transit" },
  { value: "received", label: "Received" },
  { value: "in-store", label: "In store" },
  { value: "sold", label: "Sold" },
  { value: "quarantined", label: "Quarantined" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "Network" },
  { value: "manufacturer", label: "Manufacturers" },
  { value: "supplier", label: "Suppliers" },
  { value: "retailer", label: "Retailers" },
];

const LEDGER_STATUS_COPY = {
  synced: {
    label: "Synced",
    badge: "bg-emerald-500/20 text-emerald-100 border border-emerald-500/30",
    tone: "text-emerald-200",
    description: "In sync with on-chain history",
  },
  stale: {
    label: "Needs review",
    badge: "bg-amber-500/20 text-amber-100 border border-amber-500/30",
    tone: "text-amber-200",
    description: "Inventory newer than on-chain trail",
  },
  missing: {
    label: "Unlinked",
    badge: "bg-rose-500/20 text-rose-100 border border-rose-500/30",
    tone: "text-rose-200",
    description: "No on-chain custody event found",
  },
  unknown: {
    label: "Unknown",
    badge: "bg-white/10 text-white/70 border border-white/15",
    tone: "text-white/70",
    description: "Waiting for ledger metadata",
  },
};

const resolveLedgerStatus = (status) => {
  const normalized =
    typeof status === "string" ? status.trim().toLowerCase() : "unknown";
  return LEDGER_STATUS_COPY[normalized] || LEDGER_STATUS_COPY.unknown;
};

const buildLedgerHint = (status, lastEvent) => {
  if (lastEvent) {
    return `${resolveLedgerStatus(status).label} · Last chain event ${dayjs(
      lastEvent
    ).format("MMM D, YYYY h:mm A")}`;
  }
  if (status === "synced") {
    return "Synced with latest on-chain event";
  }
  if (status === "stale") {
    return "Inventory updated after last on-chain event";
  }
  return "No on-chain custody events recorded yet";
};

const statusToneMap = {
  "in-factory": "bg-sky-500/20 text-sky-100",
  "in-transit": "bg-amber-500/20 text-amber-100",
  received: "bg-emerald-500/20 text-emerald-100",
  "in-store": "bg-indigo-500/20 text-indigo-100",
  sold: "bg-rose-500/20 text-rose-100",
  quarantined: "bg-red-500/20 text-red-100",
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

const defaultSummary = {
  totalRecords: 0,
  totalQty: 0,
  statusBreakdown: [],
  roleBreakdown: [],
  reconciliation: {
    available: false,
    breakdown: [],
  },
  lowStockWarnings: [],
};

const InventoryWorkspace = ({
  title,
  subtitle,
  scopeRole,
  sidebarLinks,
  workspaceLabel,
  forceSidebar = false,
  allowedDestinationRoles = ["manufacturer", "supplier", "retailer"],
  enableRoleSwitcher = false,
}) => {
  const { auth } = useAuth();
  const { fileEndpoint } = useConfig();
  const [inventory, setInventory] = useState([]);
  const [moves, setMoves] = useState([]);
  const [selectedSerial, setSelectedSerial] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailMoves, setDetailMoves] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [autoMoveRole, setAutoMoveRole] = useState(null);
  const [autoMoving, setAutoMoving] = useState(false);
  const [summary, setSummary] = useState(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const lowStockNotificationsRef = useRef(new Set());
  const [formState, setFormState] = useState({
    serialNumber: "",
    productName: "",
    brand: "",
    productImage: "",
    qty: 1,
    toRole: allowedDestinationRoles[0] || "supplier",
    status: "in-transit",
    notes: "",
    location: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    ownerRole: scopeRole === "admin" && enableRoleSwitcher ? "all" : scopeRole,
  });

  const destinationRoles = useMemo(() => {
    const unique = new Set(allowedDestinationRoles);
    if (scopeRole && scopeRole !== "admin") {
      unique.add(scopeRole);
    }
    return Array.from(unique);
  }, [allowedDestinationRoles, scopeRole]);

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      toRole: destinationRoles[0] || prev.toRole || "supplier",
    }));
  }, [destinationRoles]);

  const computeNextRole = useCallback(
    (currentRole) => {
      if (!destinationRoles.length) return null;
      const roleOrder = ["manufacturer", "supplier", "retailer", "admin"];
      const normalized = (currentRole || "").toLowerCase();
      const startIdx = roleOrder.indexOf(normalized);
      if (startIdx !== -1) {
        for (let idx = startIdx + 1; idx < roleOrder.length; idx += 1) {
          const candidate = roleOrder[idx];
          if (destinationRoles.includes(candidate)) {
            return candidate;
          }
        }
      }
      return destinationRoles.find((role) => role !== normalized) || null;
    },
    [destinationRoles]
  );

  const resolvedOwnerRole = useMemo(() => {
    if (scopeRole === "admin" && enableRoleSwitcher) {
      return filters.ownerRole;
    }
    return scopeRole;
  }, [scopeRole, enableRoleSwitcher, filters.ownerRole]);

  const fetchInventoryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 250,
        ownerRole: resolvedOwnerRole,
      };
      if (filters.status && filters.status !== "all") {
        params.status = filters.status;
      }
      if (filters.search?.trim()) {
        params.search = filters.search.trim();
      }

      const [inventoryRes, movesRes] = await Promise.all([
        axios.get("/inventory", { params }),
        axios.get("/inventory/moves", {
          params: {
            ownerRole: resolvedOwnerRole,
            limit: 25,
          },
        }),
      ]);

      if (!inventoryRes.data?.success) {
        throw new Error(
          inventoryRes.data?.message || "Failed to pull inventory"
        );
      }
      if (!movesRes.data?.success) {
        throw new Error(movesRes.data?.message || "Failed to pull moves");
      }

      setInventory(inventoryRes.data.items || []);
      const summaryPayload = inventoryRes.data.summary || defaultSummary;
      setSummary({
        ...defaultSummary,
        ...summaryPayload,
        reconciliation: {
          ...defaultSummary.reconciliation,
          ...(summaryPayload.reconciliation || {}),
        },
        lowStockWarnings: summaryPayload.lowStockWarnings || [],
      });
      setMoves(movesRes.data.items || []);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      toast.error(message || "Unable to load inventory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters.search, filters.status, resolvedOwnerRole]);

  const loadDetail = useCallback(async (serial) => {
    if (!serial) return;
    setDetailLoading(true);
    setDetailError(null);
    setSelectedSerial(serial);
    try {
      const [detailRes, moveRes] = await Promise.all([
        axios.get(`/inventory/${serial}`),
        axios.get("/inventory/moves", {
          params: { serialNumber: serial, limit: 10 },
        }),
      ]);

      if (!detailRes.data?.success || !detailRes.data?.item) {
        throw new Error(
          detailRes.data?.message || "Inventory record not found"
        );
      }

      setSelectedRecord(detailRes.data.item);
      setDetailMoves(moveRes.data?.items || []);
    } catch (detailErr) {
      const message = detailErr.response?.data?.message || detailErr.message;
      setDetailError(message);
      setSelectedRecord(null);
      setDetailMoves([]);
      toast.error(message || "Unable to load inventory detail");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  useEffect(() => {
    const warnings = summary.lowStockWarnings || [];
    const registry = lowStockNotificationsRef.current;
    const activeKeys = new Set();

    warnings.forEach((warning) => {
      const key = `${warning.role}:${warning.threshold}`;
      activeKeys.add(key);
      if (registry.has(key)) {
        return;
      }
      registry.add(key);
      toast.error(
        `${ROLE_LABELS[warning.role] || warning.role}: ${formatNumber(
          warning.qty
        )} units (threshold ${warning.threshold})`,
        {
          id: `low-stock-${key}`,
        }
      );
    });

    Array.from(registry).forEach((key) => {
      if (!activeKeys.has(key)) {
        registry.delete(key);
      }
    });
  }, [summary.lowStockWarnings]);

  const autoMoveOptions = useMemo(() => {
    if (!selectedRecord) return [];
    return destinationRoles.filter(
      (role) => role !== (selectedRecord.owner_role || "").toLowerCase()
    );
  }, [destinationRoles, selectedRecord]);

  useEffect(() => {
    if (!selectedRecord) {
      setAutoMoveRole(null);
      return;
    }
    if (autoMoveOptions.length === 0) {
      setAutoMoveRole(null);
      return;
    }
    setAutoMoveRole((prev) =>
      prev && autoMoveOptions.includes(prev)
        ? prev
        : computeNextRole(selectedRecord.owner_role)
    );
  }, [autoMoveOptions, computeNextRole, selectedRecord]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInventoryData();
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectRecord = (row) => {
    if (!row?.serial_number) return;
    loadDetail(row.serial_number);
  };

  const handleClearSelection = () => {
    setSelectedSerial(null);
    setSelectedRecord(null);
    setDetailMoves([]);
    setDetailError(null);
  };

  const getProductImageUrl = useCallback(
    (filename) => {
      if (!filename) return null;
      try {
        return fileEndpoint("product", filename);
      } catch (err) {
        return null;
      }
    },
    [fileEndpoint]
  );

  const renderProductImage = (filename, label) => {
    const imageUrl = getProductImageUrl(filename);
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={label || "Product"}
          className="h-12 w-12 rounded-2xl object-cover"
        />
      );
    }
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-base font-semibold text-white/80">
        {(label || "?").slice(0, 1).toUpperCase()}
      </div>
    );
  };

  const handlePrefill = (row) => {
    if (!row) return;
    const nextRole = destinationRoles.find((role) => role !== row.owner_role);
    setFormState((prev) => ({
      ...prev,
      serialNumber: row.serial_number,
      productName: row.product_name || prev.productName,
      brand: row.brand || prev.brand,
      productImage: row.product_image || prev.productImage,
      qty: row.qty || 1,
      toRole: nextRole || prev.toRole,
      status: row.status || prev.status,
      location: row.location || "",
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMoveSubmit = async (event) => {
    event.preventDefault();
    if (!formState.serialNumber.trim()) {
      toast.error("Serial number is required");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/inventory/move", {
        serialNumber: formState.serialNumber.trim(),
        productName: formState.productName?.trim() || undefined,
        brand: formState.brand?.trim() || undefined,
        productImage: formState.productImage?.trim() || undefined,
        qty: Number(formState.qty) || 1,
        toRole: formState.toRole || scopeRole,
        status: formState.status?.trim() || undefined,
        notes: formState.notes?.trim() || undefined,
        location: formState.location?.trim() || undefined,
        metadata: {
          workspaceRole: scopeRole,
          actor: auth?.user,
          source: "inventory-workspace",
        },
      });
      toast.success("Inventory move recorded");
      setFormState((prev) => ({
        ...prev,
        notes: "",
        serialNumber: "",
        productImage: "",
      }));
      fetchInventoryData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to move inventory");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoMove = async () => {
    if (!selectedRecord) {
      toast.error("Select a record first");
      return;
    }
    if (!autoMoveRole) {
      toast.error("Choose a destination role");
      return;
    }
    setAutoMoving(true);
    try {
      await axios.post("/inventory/move", {
        serialNumber: selectedRecord.serial_number,
        productName: selectedRecord.product_name,
        brand: selectedRecord.brand,
        productImage: selectedRecord.product_image,
        qty: selectedRecord.qty || 1,
        toRole: autoMoveRole,
        fromRole: selectedRecord.owner_role,
        status: getDefaultStatusForRole(autoMoveRole),
        location: selectedRecord.location || undefined,
        metadata: {
          workspaceRole: scopeRole,
          action: "detail-auto-move",
        },
      });
      toast.success(
        `Move recorded to ${ROLE_LABELS[autoMoveRole] || autoMoveRole}`
      );
      await fetchInventoryData();
      await loadDetail(selectedRecord.serial_number);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record move");
    } finally {
      setAutoMoving(false);
    }
  };

  const summaryMeta = useMemo(
    () => [
      {
        label: "Total units",
        value: formatNumber(summary.totalQty),
        key: "units",
      },
      {
        label: "Records",
        value: formatNumber(summary.totalRecords),
        key: "records",
      },
    ],
    [summary]
  );

  const detailMetadata = useMemo(() => {
    if (!selectedRecord?.metadata) return [];
    if (typeof selectedRecord.metadata === "object") {
      return Object.entries(selectedRecord.metadata || {});
    }
    try {
      const parsed = JSON.parse(selectedRecord.metadata);
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed);
      }
    } catch (err) {
      return [];
    }
    return [];
  }, [selectedRecord]);

  const selectedLedgerStatus = useMemo(
    () => resolveLedgerStatus(selectedRecord?.reconciliation_status),
    [selectedRecord?.reconciliation_status]
  );

  const refreshButton = (
    <button
      type="button"
      className={`${glassButtonClass} ${refreshing ? "opacity-60" : ""}`}
      onClick={handleRefresh}
      disabled={refreshing}
    >
      {refreshing ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <span className="text-base">⟳</span>
      )}
      <span>{refreshing ? "Refreshing" : "Refresh data"}</span>
    </button>
  );

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      meta={summaryMeta}
      actions={refreshButton}
      sidebarLinks={sidebarLinks}
      workspaceLabel={workspaceLabel}
      forceSidebar={forceSidebar}
      showHeaderNotifications={scopeRole === "admin"}
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
        {error ? (
          <GlassCard className="border border-rose-500/40 bg-rose-500/10 p-6 text-rose-50">
            <p className="font-semibold">Inventory unavailable</p>
            <p className="text-sm text-rose-100/80">{error}</p>
          </GlassCard>
        ) : null}

        <GlassCard className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col text-sm text-white/70">
                <span className="mb-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
                  Search serial / brand
                </span>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="AUTO-1243"
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm text-white/70">
                <span className="mb-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
                  Status
                </span>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className={`${glassSelectClass} rounded-2xl px-4 py-2`}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {scopeRole === "admin" && enableRoleSwitcher ? (
                <label className="flex flex-col text-sm text-white/70">
                  <span className="mb-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
                    Owner role
                  </span>
                  <select
                    value={filters.ownerRole}
                    onChange={(e) =>
                      handleFilterChange("ownerRole", e.target.value)
                    }
                    className={`${glassSelectClass} rounded-2xl px-4 py-2`}
                  >
                    {ROLE_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    search: "",
                    status: "all",
                  }))
                }
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Clear filters
              </button>
            </div>
          </div>
        </GlassCard>

        {summary.reconciliation?.available ? (
          <GlassCard className="p-6">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Ledger health
              </p>
              <p className="text-sm text-white/60">
                Blockchain reconciliation overview
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {summary.reconciliation.breakdown?.length ? (
                summary.reconciliation.breakdown.map((row) => {
                  const ledger = resolveLedgerStatus(row.status);
                  return (
                    <div
                      key={row.status}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className={`text-sm font-semibold ${ledger.tone}`}>
                        {ledger.label}
                      </p>
                      <p className="text-xs text-white/40">
                        {ledger.description}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {formatNumber(row.records || row.total || 0)}
                      </p>
                      <p className="text-xs text-white/40">records</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-white/60">
                  No reconciliation data available yet.
                </p>
              )}
            </div>
          </GlassCard>
        ) : null}

        {summary.lowStockWarnings?.length ? (
          <GlassCard className="border border-rose-500/30 bg-rose-500/10 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Low stock alerts
            </p>
            <p className="text-sm text-white/70">
              Roles that have dipped below configured thresholds.
            </p>
            <div className="mt-4 space-y-3">
              {summary.lowStockWarnings.map((warning) => (
                <div
                  key={`${warning.role}-${warning.threshold}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold capitalize">
                      {ROLE_LABELS[warning.role] || warning.role}
                    </p>
                    <p className="text-xs text-white/60">
                      Threshold {formatNumber(warning.threshold)} units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {formatNumber(warning.qty)}
                    </p>
                    <p className="text-xs text-white/60">Current stock</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2 overflow-hidden p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                  Inventory records
                </p>
                <p className="text-sm text-white/60">
                  Showing {formatNumber(inventory.length)} entries
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-white/5 text-white/60">
                  <tr>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em]">
                      Serial
                    </th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em]">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em]">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em]">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em]">
                      Ledger
                    </th>
                    <th className="px-4 py-3 text-left uppercase tracking-[0.3em]">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-left" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-white/60"
                      >
                        Loading inventory…
                      </td>
                    </tr>
                  ) : inventory.length ? (
                    inventory.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => handleSelectRecord(row)}
                        className={`cursor-pointer transition ${
                          selectedSerial === row.serial_number
                            ? "bg-white/10"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-white">
                          {row.serial_number}
                        </td>
                        <td className="px-4 py-3 text-white/70">
                          <div className="flex items-center gap-3">
                            {renderProductImage(
                              row.product_image,
                              row.product_name || row.serial_number
                            )}
                            <div>
                              <div className="font-medium text-white">
                                {row.product_name || row.serial_number || "—"}
                              </div>
                              <div className="text-xs uppercase tracking-[0.3em] text-white/40">
                                {row.brand || "No brand"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize text-white/70">
                          {ROLE_LABELS[row.owner_role] || row.owner_role || "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {formatNumber(row.qty)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              statusToneMap[row.status] ||
                              "bg-white/10 text-white"
                            }`}
                          >
                            {row.status || "unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const ledger = resolveLedgerStatus(
                              row.reconciliation_status
                            );
                            return (
                              <span
                                title={buildLedgerHint(
                                  row.reconciliation_status,
                                  row.last_chain_event_at
                                )}
                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${ledger.badge}`}
                              >
                                {ledger.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-white/60">
                          {row.updated_at
                            ? dayjs(row.updated_at).format("MMM D, YYYY h:mm A")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectRecord(row);
                              }}
                              className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70 hover:text-white"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handlePrefill(row);
                              }}
                              className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 hover:text-white"
                            >
                              Prefill
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-white/50"
                      >
                        No inventory records match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GradientBorderCard className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              Record a movement
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleMoveSubmit}>
              <div>
                <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Serial number
                </label>
                <input
                  type="text"
                  value={formState.serialNumber}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      serialNumber: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
                  placeholder="AUTO-12345"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Product name
                  <input
                    type="text"
                    value={formState.productName}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        productName: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Brand
                  <input
                    type="text"
                    value={formState.brand}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        brand: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={formState.qty}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        qty: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Destination role
                  <select
                    value={formState.toRole}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        toRole: e.target.value,
                      }))
                    }
                    className={`${glassSelectClass} mt-1 w-full rounded-2xl px-4 py-2`}
                  >
                    {destinationRoles.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role] || role}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                Status
                <select
                  value={formState.status}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className={`${glassSelectClass} mt-1 w-full rounded-2xl px-4 py-2`}
                >
                  {STATUS_OPTIONS.filter(
                    (option) => option.value !== "all"
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                Location
                <input
                  type="text"
                  value={formState.location}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
                  placeholder="Dock 3 / NYC"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.35em] text-white/40">
                Notes / memo
                <textarea
                  value={formState.notes}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-white/40 focus:outline-none"
                  placeholder="Shipment ID, dock, etc."
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className={`${glassButtonClass} w-full justify-center ${
                  submitting ? "opacity-60" : ""
                }`}
              >
                {submitting ? "Saving…" : "Record move"}
              </button>
            </form>
          </GradientBorderCard>
        </div>

        <GlassCard className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Inventory detail
              </p>
              <p className="text-sm text-white/60">
                {selectedRecord
                  ? `${selectedRecord.serial_number} · ${
                      ROLE_LABELS[selectedRecord.owner_role] ||
                      selectedRecord.owner_role ||
                      "Unknown"
                    }`
                  : "Select a row to inspect enriched metadata and trigger instant moves."}
              </p>
            </div>
            {selectedRecord ? (
              <button
                type="button"
                onClick={handleClearSelection}
                className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Clear selection
              </button>
            ) : null}
          </div>
          <div className="mt-6">
            {detailLoading ? (
              <div className="flex items-center justify-center py-10 text-white/60">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="ml-3 text-sm">Loading detail…</span>
              </div>
            ) : detailError ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-100">
                <p className="text-sm">{detailError}</p>
                <button
                  type="button"
                  onClick={() => loadDetail(selectedSerial)}
                  className="mt-3 rounded-2xl border border-rose-300/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-100 transition hover:border-rose-100 hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : selectedRecord ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="flex flex-col items-center gap-3 lg:w-1/3">
                    <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                      {(() => {
                        const imageUrl = getProductImageUrl(
                          selectedRecord.product_image
                        );
                        if (imageUrl) {
                          return (
                            <img
                              src={imageUrl}
                              alt={
                                selectedRecord.product_name ||
                                selectedRecord.serial_number
                              }
                              className="h-full w-full object-cover"
                            />
                          );
                        }
                        return (
                          <span className="text-4xl font-semibold text-white/40">
                            {(
                              selectedRecord.product_name ||
                              selectedRecord.serial_number ||
                              "?"
                            )
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white">
                        {selectedRecord.product_name ||
                          selectedRecord.serial_number}
                      </p>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                        {selectedRecord.brand || "No brand"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePrefill(selectedRecord)}
                      className={`${glassButtonClass} w-full justify-center`}
                    >
                      Prefill move form
                    </button>
                  </div>
                  <div className="grid flex-1 gap-4 md:grid-cols-2">
                    {[
                      {
                        label: "Serial",
                        value: selectedRecord.serial_number,
                      },
                      {
                        label: "Owner role",
                        value:
                          ROLE_LABELS[selectedRecord.owner_role] ||
                          selectedRecord.owner_role ||
                          "—",
                      },
                      {
                        label: "Quantity",
                        value: formatNumber(selectedRecord.qty),
                      },
                      {
                        label: "Status",
                        value: selectedRecord.status || "unknown",
                      },
                      {
                        label: "Ledger status",
                        value: selectedLedgerStatus.label,
                        tone: selectedLedgerStatus.tone,
                        hint: buildLedgerHint(
                          selectedRecord.reconciliation_status,
                          selectedRecord.last_chain_event_at
                        ),
                      },
                      {
                        label: "Location",
                        value: selectedRecord.location || "—",
                      },
                      {
                        label: "Notes",
                        value: selectedRecord.notes || "—",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                          {item.label}
                        </p>
                        <p
                          className={`mt-2 text-sm ${
                            item.tone || "text-white/80"
                          }`}
                        >
                          {item.value}
                        </p>
                        {item.hint ? (
                          <p className="mt-1 text-xs text-white/40">
                            {item.hint}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {detailMetadata.length ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                      Metadata snapshot
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {detailMetadata.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-2xl border border-white/5 bg-white/5 p-3"
                        >
                          <p className="text-[11px] uppercase tracking-[0.4em] text-white/30">
                            {key}
                          </p>
                          <p className="mt-1 text-sm text-white/80">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value || "—")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Automatic movement
                  </p>
                  {autoMoveOptions.length ? (
                    <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
                      <label className="flex-1 text-xs uppercase tracking-[0.35em] text-white/40">
                        Destination role
                        <select
                          value={autoMoveRole || ""}
                          onChange={(e) =>
                            setAutoMoveRole(e.target.value || null)
                          }
                          className={`${glassSelectClass} mt-2 w-full rounded-2xl px-4 py-2`}
                        >
                          <option value="" disabled>
                            Choose role
                          </option>
                          {autoMoveOptions.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role] || role}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={autoMoving || !autoMoveRole}
                        onClick={handleAutoMove}
                        className={`${glassButtonClass} min-w-[220px] justify-center ${
                          autoMoving || !autoMoveRole ? "opacity-60" : ""
                        }`}
                      >
                        {autoMoving ? "Recording…" : "Record move"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-white/60">
                      No downstream destinations are available for this role.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-white/40">
                    Uses the current quantity (
                    {formatNumber(selectedRecord.qty)}) and marks the unit as
                    in-transit.
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Recent moves for {selectedRecord.serial_number}
                  </p>
                  {detailMoves.length ? (
                    <ul className="mt-4 space-y-3 text-sm text-white/70">
                      {detailMoves.map((move) => {
                        const manufacturingMove =
                          isManufacturingIntakeMove(move);
                        const toLabel =
                          ROLE_LABELS[move.to_owner_role] ||
                          move.to_owner_role ||
                          "Manufacturer";
                        const fromLabel =
                          ROLE_LABELS[move.from_owner_role] ||
                          move.from_owner_role ||
                          "Unknown";
                        return (
                          <li
                            key={move.id}
                            className="rounded-2xl border border-white/5 bg-white/5 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-white">
                              {manufacturingMove ? (
                                <>
                                  <span className="font-semibold">
                                    Manufactured
                                  </span>
                                  <span className="rounded-full border border-white/15 px-3 py-0.5 text-[10px] uppercase tracking-[0.4em] text-white/50">
                                    {toLabel}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold">
                                    {fromLabel}
                                  </span>
                                  <span className="text-white/40">→</span>
                                  <span>{toLabel}</span>
                                </>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/30">
                              <span>
                                {dayjs(move.moved_at).format(
                                  "MMM D, YYYY h:mm A"
                                )}
                              </span>
                              <span>Qty {formatNumber(move.qty)}</span>
                              <span>
                                {move.status ||
                                  getDefaultStatusForRole(move.to_owner_role)}
                              </span>
                            </div>
                            {move.notes ? (
                              <p className="mt-2 text-xs text-white/60">
                                {move.notes}
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 text-white/50">
                      No move history for this serial yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-white/50">
                Select a row above to preview item metadata, image, and quick
                actions.
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
            Recent moves
          </p>
          {moves.length ? (
            <ul className="mt-4 space-y-4 text-sm text-white/70">
              {moves.map((move) => {
                const manufacturingMove = isManufacturingIntakeMove(move);
                const toLabel =
                  ROLE_LABELS[move.to_owner_role] ||
                  move.to_owner_role ||
                  "unknown";
                const fromLabel =
                  ROLE_LABELS[move.from_owner_role] ||
                  move.from_owner_role ||
                  "unknown";
                return (
                  <li
                    key={move.id}
                    className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white font-semibold">
                        {move.serial_number}
                      </span>
                      <span className="text-white/50">·</span>
                      <span className="capitalize">
                        {manufacturingMove ? (
                          <>
                            Manufactured
                            <span className="text-white/40">
                              {` · ${toLabel}`}
                            </span>
                          </>
                        ) : (
                          <>
                            {fromLabel}
                            <span className="mx-1 text-white/40">→</span>
                            {toLabel}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/40">
                      <span>
                        {dayjs(move.moved_at).format("MMM D, YYYY h:mm A")}
                      </span>
                      <span>Qty {formatNumber(move.qty)}</span>
                      <span>
                        {move.status ||
                          getDefaultStatusForRole(move.to_owner_role)}
                      </span>
                    </div>
                    {move.notes ? (
                      <p className="text-white/60 text-xs">{move.notes}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-white/50">No recent moves recorded.</p>
          )}
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default InventoryWorkspace;
