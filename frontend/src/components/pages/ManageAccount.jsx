import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import { GlassCard, glassButtonClass } from "../admin/ui";

const ROLE_FILTERS = [
  { value: "all", label: "All accounts" },
  { value: "manufacturer", label: "Manufacturers", accent: "bg-emerald-500/25" },
  { value: "supplier", label: "Suppliers", accent: "bg-rose-500/25" },
  { value: "retailer", label: "Retailers", accent: "bg-indigo-500/25" },
];

const columns = [
  { field: "name", headerName: "Name" },
  { field: "username", headerName: "Username" },
  { field: "description", headerName: "Description" },
  { field: "website", headerName: "Website" },
  { field: "location", headerName: "Location" },
  { field: "role", headerName: "Role" },
];

const inputClasses =
  "w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-2.5 text-sm text-white/80 placeholder-white/35 transition focus:border-white/40 focus:outline-none focus:ring-0";

const chipClasses =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold text-white/70";

const roleBadgeClasses = {
  manufacturer:
    "inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100",
  supplier:
    "inline-flex items-center rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-100",
  retailer:
    "inline-flex items-center rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100",
  default:
    "inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70",
};

const normalizeRole = (role) => (role ? role.toLowerCase() : "");

const formatRole = (role) => {
  if (!role) return "—";
  const value = normalizeRole(role);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const sanitizeWebsite = (website) => {
  if (!website) return "";
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
};

const ManageAccount = () => {
  const { apiBaseUrl } = useConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const roleFilter = normalizeRole(searchParams.get("role")) || "all";

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/profileAll`);
      const normalized = (response.data || []).map((row, index) => ({
        ...row,
        role: normalizeRole(row.role) || "",
        id: row.id || row._id || row.username || index,
      }));
      setAccounts(normalized);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Failed to load accounts", error);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const roleCounts = useMemo(() => {
    return accounts.reduce((acc, account) => {
      const role = normalizeRole(account.role);
      if (!role) return acc;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
  }, [accounts]);

  const handleRoleChange = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === "all") {
      nextParams.delete("role");
    } else {
      nextParams.set("role", value);
    }
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setSearchTerm("");
    handleRoleChange("all");
  };

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const byRole =
      roleFilter === "all"
        ? accounts
        : accounts.filter(
            (account) => normalizeRole(account.role) === roleFilter
          );

    if (!normalizedSearch) {
      return byRole;
    }

    return byRole.filter((account) => {
      const haystack = [
        account.name,
        account.username,
        account.description,
        account.website,
        account.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [accounts, roleFilter, searchTerm]);

  const totalAccounts = accounts.length;
  const activeRole =
    ROLE_FILTERS.find((filter) => filter.value === roleFilter) || ROLE_FILTERS[0];

  const activeFilters = useMemo(() => {
    const entries = [];
    if (roleFilter !== "all") {
      entries.push({ label: "Segment", value: activeRole.label });
    }
    if (searchTerm.trim()) {
      entries.push({ label: "Search", value: searchTerm.trim() });
    }
    return entries;
  }, [activeRole.label, roleFilter, searchTerm]);

  const metaSummary = useMemo(() => {
    const updatedLabel = lastRefreshed
      ? new Date(lastRefreshed).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Pending";

    return [
      {
        label: "Records",
        value: filteredAccounts.length.toLocaleString(),
        key: "records",
      },
      {
        label: "Segment",
        value: activeRole.label,
        key: "segment",
      },
      {
        label: "Search",
        value: searchTerm.trim() ? `“${searchTerm.trim()}”` : "All results",
        key: "search",
      },
      { label: "Updated", value: updatedLabel, key: "updated" },
    ];
  }, [activeRole.label, filteredAccounts.length, lastRefreshed, searchTerm]);

  const summaryCards = useMemo(() => {
    return ROLE_FILTERS.filter((filter) => filter.value !== "all").map(
      ({ value, label, accent }) => {
        const count = roleCounts[value] || 0;
        const share = totalAccounts
          ? Math.round((count / totalAccounts) * 100)
          : 0;
        return {
          key: value,
          label,
          count,
          share,
          accent: accent || "bg-white/10",
        };
      }
    );
  }, [roleCounts, totalAccounts]);

  const openEditModal = (account) => {
    setEditDraft({
      id: account.id,
      username: account.username || "",
      name: account.name || "",
      description: account.description || "",
      website: account.website || "",
      location: account.location || "",
      role: normalizeRole(account.role) || "",
    });
  };

  const closeEditModal = () => {
    setEditDraft(null);
    setSaving(false);
  };

  const handleEditFieldChange = (field, value) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editDraft) return;
    setSaving(true);
    try {
      const payload = {
        ...editDraft,
        role: normalizeRole(editDraft.role),
      };
      await axios.put(`${apiBaseUrl}/users/${editDraft.id}`, payload);
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === editDraft.id ? { ...account, ...payload } : account
        )
      );
      toast.success("Account updated");
      closeEditModal();
    } catch (error) {
      console.error("Failed to update account", error);
      toast.error("Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAccount = async (account) => {
    if (!account?.id) return;
    const confirmation = window.confirm(
      `Remove ${account.name || account.username || "this account"}?`
    );
    if (!confirmation) return;

    setRemovingId(account.id);
    try {
      await axios.delete(`${apiBaseUrl}/users/${account.id}`);
      setAccounts((prev) =>
        prev.filter((existing) => existing.id !== account.id)
      );
      toast.success("Account removed");
    } catch (error) {
      console.error("Failed to remove account", error);
      toast.error("Failed to remove account");
    } finally {
      setRemovingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAccounts();
    } finally {
      setRefreshing(false);
    }
  };

  const toolbar = (
    <GlassCard className="w-full space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
            Directory filters
          </p>
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Shape the account view
          </h2>
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm font-medium text-white/70 transition hover:text-white"
        >
          Reset filters
        </button>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {ROLE_FILTERS.map((filter) => {
            const isActive = filter.value === roleFilter;
            const count = filter.value === "all"
              ? totalAccounts
              : roleCounts[filter.value] || 0;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleRoleChange(filter.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-white/35 bg-white/15 text-white shadow-[0_22px_50px_-40px_rgba(56,189,248,0.9)]"
                    : "border-white/12 bg-white/5 text-white/70 hover:border-white/25 hover:text-white"
                }`}
              >
                <span>{filter.label}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] text-white/70">
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={inputClasses}
              placeholder="Search name, username, or location"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {activeFilters.length ? (
        <div className="flex flex-wrap gap-3">
          {activeFilters.map((item) => (
            <span
              key={`${item.label}-${item.value}`}
              className={chipClasses}
            >
              <span className="text-[0.6rem] uppercase tracking-wide text-white/50">
                {item.label}
              </span>
              <span className="font-medium text-white/90">{item.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </GlassCard>
  );

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleRefresh}
        className={`${glassButtonClass} ${refreshing ? "cursor-wait opacity-70" : ""}`}
        disabled={refreshing}
      >
        {refreshing ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <span className="text-base">⟳</span>
        )}
        <span>{refreshing ? "Refreshing" : "Refresh"}</span>
      </button>
      <Link to="/add-account" className={glassButtonClass}>
        <span className="text-base">＋</span>
        <span>New account</span>
      </Link>
    </div>
  );

  return (
    <>
      <AdminShell
        title="Account Directory"
        subtitle="Govern every manufacturer, supplier, and retail operator connected to the ProductGuard network."
        meta={metaSummary}
        actions={headerActions}
        toolbar={toolbar}
      >
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8">
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <GlassCard className="relative overflow-hidden p-6">
              <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-400/20 blur-3xl" />
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
                Total accounts
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {totalAccounts.toLocaleString()}
              </p>
              <p className="mt-3 text-sm text-white/60">
                Across all partner roles and geographies
              </p>
            </GlassCard>
            {summaryCards.map((card) => (
              <GlassCard key={card.key} className="relative overflow-hidden p-6">
                <span
                  className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${card.accent}`}
                />
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {card.count.toLocaleString()}
                </p>
                <p className="mt-3 text-sm text-white/60">
                  {card.share}% of active directory
                </p>
              </GlassCard>
            ))}
          </section>

          <GlassCard className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Account registry
                </h2>
                <p className="text-sm text-white/60">
                  {filteredAccounts.length.toLocaleString()} records in the current view
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className={`${glassButtonClass} ${refreshing ? "cursor-wait opacity-70" : ""}`}
                disabled={refreshing}
              >
                {refreshing ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <span className="text-base">⟳</span>
                )}
                <span>{refreshing ? "Refreshing" : "Reload"}</span>
              </button>
            </div>
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <span className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center gap-3 text-white/60">
                <span className="text-3xl">🗂️</span>
                <p className="text-sm">No accounts match the current filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-white/70 transition hover:text-white"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/5">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.field}
                          className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-white/50"
                        >
                          {column.headerName}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAccounts.map((account) => (
                      <tr
                        key={account.id}
                        className="transition hover:bg-white/5"
                      >
                        {columns.map((column) => {
                          const value = account[column.field];
                          if (column.field === "role") {
                            const roleKey = normalizeRole(value);
                            const badgeClass =
                              roleBadgeClasses[roleKey] || roleBadgeClasses.default;
                            return (
                              <td key={column.field} className="px-6 py-4 text-sm">
                                <span className={badgeClass}>{formatRole(value)}</span>
                              </td>
                            );
                          }
                          if (column.field === "website") {
                            return (
                              <td key={column.field} className="px-6 py-4 text-sm">
                                {value ? (
                                  <a
                                    href={sanitizeWebsite(value)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-300 transition hover:text-sky-100"
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  <span className="text-white/40">—</span>
                                )}
                              </td>
                            );
                          }
                          return (
                            <td key={column.field} className="px-6 py-4 text-sm text-white/80">
                              {value ? value : <span className="text-white/40">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-sm text-white/80">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(account)}
                              className={`${glassButtonClass} px-3 py-1 text-xs`}
                            >
                              ✎ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAccount(account)}
                              className={`${glassButtonClass} border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs text-rose-100 hover:border-rose-300/60 hover:bg-rose-500/25`}
                              disabled={removingId === account.id}
                            >
                              {removingId === account.id ? "Removing…" : "Remove"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </AdminShell>
      {editDraft ? (
        <EditAccountModal
          account={editDraft}
          onFieldChange={handleEditFieldChange}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
          saving={saving}
        />
      ) : null}
    </>
  );
};

const EditAccountModal = ({ account, onFieldChange, onClose, onSave, saving }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur">
    <GlassCard className="w-full max-w-xl space-y-6 p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Edit account</h2>
          <p className="mt-1 text-sm text-white/60">
            Update partner metadata and role alignment for this account.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/60 transition hover:text-white"
          aria-label="Close edit modal"
        >
          ✕
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Username
          </span>
          <input
            type="text"
            value={account.username}
            readOnly
            className={`${inputClasses} cursor-not-allowed text-white/60`}
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Role
          </span>
          <select
            value={account.role}
            onChange={(event) => onFieldChange("role", event.target.value)}
            className={`${inputClasses} bg-white/10`}
          >
            <option value="">Select role</option>
            <option value="manufacturer">Manufacturer</option>
            <option value="supplier">Supplier</option>
            <option value="retailer">Retailer</option>
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Display name
          </span>
          <input
            type="text"
            value={account.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            className={inputClasses}
            placeholder="Acme Manufacturing"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Description
          </span>
          <textarea
            value={account.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            className={`${inputClasses} min-h-[96px] resize-none`}
            placeholder="Brief summary of the partner and their scope"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Website
          </span>
          <input
            type="text"
            value={account.website}
            onChange={(event) => onFieldChange("website", event.target.value)}
            className={inputClasses}
            placeholder="https://partner-domain.com"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Location
          </span>
          <input
            type="text"
            value={account.location}
            onChange={(event) => onFieldChange("location", event.target.value)}
            className={inputClasses}
            placeholder="Singapore, SG"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className={glassButtonClass}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className={`${glassButtonClass} border-emerald-400/40 bg-emerald-500/20 hover:border-emerald-300/60 hover:bg-emerald-500/30 ${
            saving ? "cursor-wait opacity-70" : ""
          }`}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </GlassCard>
  </div>
);

export default ManageAccount;
