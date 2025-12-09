import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Chart from "react-apexcharts";
import { toast } from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";
import AdminShell from "../admin/AdminShell";
import { GlassCard, glassButtonClass } from "../admin/ui";

const cleanString = (value) => (value ?? "").toString().trim();

const isMeaningfulValue = (value) => {
  const normalized = cleanString(value).toLowerCase();
  if (!normalized) return false;
  return !["unknown", "undefined", "null", "na", "n/a", "none"].includes(
    normalized
  );
};

const toTitleCase = (value) => {
  const normalized = cleanString(value);
  if (!normalized) return "";
  return normalized
    .toLowerCase()
    .split(/[\s,/_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const normalizeCityName = (city) => {
  if (!isMeaningfulValue(city)) {
    return "";
  }
  return toTitleCase(city);
};

const COUNTRY_ALIASES = new Map(
  Object.entries({
    us: "United States",
    usa: "United States",
    "united states": "United States",
    "united states of america": "United States",
    uk: "United Kingdom",
    gb: "United Kingdom",
    "great britain": "United Kingdom",
    uae: "United Arab Emirates",
    "united arab emirates": "United Arab Emirates",
    "south korea": "South Korea",
    "korea, republic of": "South Korea",
    "north korea": "North Korea",
    prc: "China",
    "people's republic of china": "China",
    cn: "China",
    viet: "Vietnam",
    vn: "Vietnam",
    eu: "European Union",
    "hong kong": "Hong Kong",
    "taiwan, province of china": "Taiwan",
    "syrian arab republic": "Syria",
  })
);

const createRegionFormatter = () => {
  const normalizeCountry = (countryRaw) => {
    if (!isMeaningfulValue(countryRaw)) {
      return "Unknown Region";
    }
    const normalized = cleanString(countryRaw).toLowerCase();
    if (COUNTRY_ALIASES.has(normalized)) {
      return COUNTRY_ALIASES.get(normalized);
    }
    return toTitleCase(countryRaw);
  };

  const normalizeState = (stateRaw) => {
    if (!isMeaningfulValue(stateRaw)) {
      return "";
    }
    return toTitleCase(stateRaw);
  };

  const buildLabel = ({ city, state, country }) => {
    const locality = [city, state].filter(Boolean).join(", ");
    if (locality && country && country !== "Unknown Region") {
      return `${locality}, ${country}`;
    }
    if (country && country !== "Unknown Region") {
      return country;
    }
    return locality || "Unknown Region";
  };

  return {
    normalizeCountry,
    normalizeState,
    buildLabel,
  };
};

const normalizeCountryName = (country, formatter) => {
  if (formatter?.normalizeCountry) {
    return formatter.normalizeCountry(country);
  }
  return isMeaningfulValue(country) ? toTitleCase(country) : "Unknown Region";
};

const deriveGeoLabel = (row, formatter) => {
  const city = normalizeCityName(row.city);
  const state = formatter?.normalizeState
    ? formatter.normalizeState(row.state)
    : normalizeCityName(row.state);
  const country = normalizeCountryName(row.country, formatter);
  const label = formatter?.buildLabel
    ? formatter.buildLabel({ city, state, country })
    : [city, state, country].filter(Boolean).join(", ") || country;

  return {
    label: label || "Unknown Region",
    city,
    state,
    country,
  };
};

const formatPercent = (value, total, decimals = 1) => {
  const numerator = Number(value || 0);
  const denominator = Number(total || 0);
  if (!denominator || Number.isNaN(numerator) || Number.isNaN(denominator)) {
    return "0%";
  }
  const ratio = (numerator / denominator) * 100;
  return `${ratio.toFixed(decimals)}%`;
};

const formatNumber = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) {
    return "0";
  }
  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1)}M`;
  }
  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(1)}K`;
  }
  return number.toLocaleString();
};
const AnalyticsDashboard = () => {
  const { apiBaseUrl } = useConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardTotals, setDashboardTotals] = useState(null);
  const [scanSeriesRaw, setScanSeriesRaw] = useState([]);
  const [loginSeriesRaw, setLoginSeriesRaw] = useState([]);
  const [suspiciousSummary, setSuspiciousSummary] = useState(null);
  const [topCounterfeitBrands, setTopCounterfeitBrands] = useState([]);
  const [geoData, setGeoData] = useState([]);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [inventoryMoves, setInventoryMoves] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const regionFormatter = useMemo(() => createRegionFormatter(), []);

  const loadDashboard = useCallback(
    async ({ showGlobalSpinner = true } = {}) => {
      if (showGlobalSpinner) {
        setLoading(true);
      }
      setError(null);
      try {
        const [
          dashboardRes,
          scansRes,
          loginsRes,
          suspiciousRes,
          counterfeitRes,
          geoRes,
          inventorySummaryRes,
          inventoryMovesRes,
        ] = await Promise.all([
          fetch(`${apiBaseUrl}/dashboard-analytics`),
          fetch(`${apiBaseUrl}/analytics/scans/daily?days=30`),
          fetch(`${apiBaseUrl}/analytics/logins/daily?days=30`),
          fetch(`${apiBaseUrl}/analytics/scans/suspicious-summary?days=30`),
          fetch(`${apiBaseUrl}/analytics/counterfeit/top?days=30&limit=10`),
          fetch(`${apiBaseUrl}/analytics/scans/geo?days=30`),
          fetch(`${apiBaseUrl}/analytics/inventory/summary?days=45`),
          fetch(`${apiBaseUrl}/analytics/inventory/moves?days=45`),
        ]);

        if (!dashboardRes.ok) throw new Error("Dashboard analytics failed");
        if (!scansRes.ok) throw new Error("Scan analytics failed");
        if (!loginsRes.ok) throw new Error("Login analytics failed");
        if (!suspiciousRes.ok) throw new Error("Suspicious summary failed");
        if (!counterfeitRes.ok) throw new Error("Counterfeit analytics failed");
        if (!geoRes.ok) throw new Error("Geo analytics failed");
        if (!inventorySummaryRes.ok)
          throw new Error("Inventory summary failed");
        if (!inventoryMovesRes.ok) throw new Error("Inventory moves failed");

        const [
          dashboardJson,
          scansJson,
          loginsJson,
          suspiciousJson,
          counterfeitJson,
          geoJson,
          inventorySummaryJson,
          inventoryMovesJson,
        ] = await Promise.all([
          dashboardRes.json(),
          scansRes.json(),
          loginsRes.json(),
          suspiciousRes.json(),
          counterfeitRes.json(),
          geoRes.json(),
          inventorySummaryRes.json(),
          inventoryMovesRes.json(),
        ]);

        setDashboardTotals(dashboardJson);
        setScanSeriesRaw(scansJson?.data || []);
        setLoginSeriesRaw(loginsJson?.data || []);
        setSuspiciousSummary(suspiciousJson);
        setTopCounterfeitBrands(counterfeitJson?.data || []);
        setGeoData(geoJson?.data || []);
        setInventorySummary(inventorySummaryJson);
        setInventoryMoves(inventoryMovesJson);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to load analytics dashboard", err);
        setError(err.message || "Failed to load analytics data");
        toast.error(err.message || "Failed to load analytics");
      } finally {
        if (showGlobalSpinner) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard({ showGlobalSpinner: false });
  };

  const scanSeries = useMemo(() => {
    if (!scanSeriesRaw?.length) {
      return {
        categories: [],
        authentic: [],
        counterfeit: [],
        suspicious: [],
      };
    }
    const sorted = [...scanSeriesRaw].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    return {
      categories: sorted.map((row) => row.date),
      authentic: sorted.map((row) => Number(row.authentic_scans || 0)),
      counterfeit: sorted.map((row) => Number(row.counterfeit_scans || 0)),
      suspicious: sorted.map((row) => Number(row.suspicious_scans || 0)),
    };
  }, [scanSeriesRaw]);

  const loginSeries = useMemo(() => {
    if (!loginSeriesRaw?.length) {
      return {
        categories: [],
        success: [],
        failure: [],
      };
    }
    const sorted = [...loginSeriesRaw].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    return {
      categories: sorted.map((row) => row.date),
      success: sorted.map((row) => Number(row.successful_logins || 0)),
      failure: sorted.map((row) => Number(row.failed_logins || 0)),
    };
  }, [loginSeriesRaw]);

  const suspiciousTrend = useMemo(() => {
    const trend = suspiciousSummary?.data?.trend || [];
    if (!trend.length) {
      return { categories: [], counts: [] };
    }
    const sorted = [...trend].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    return {
      categories: sorted.map((row) => row.date),
      counts: sorted.map((row) => Number(row.suspicious_scans || 0)),
    };
  }, [suspiciousSummary]);

  const geoBreakdown = useMemo(() => {
    if (!geoData?.length) {
      return { chart: [], entries: [], totalRegions: 0 };
    }

    const aggregates = new Map();
    geoData.forEach((row) => {
      const derived = deriveGeoLabel(row, regionFormatter);
      const key = derived.label.toLowerCase();
      const scans = Number(row.scans || 0);

      if (!aggregates.has(key)) {
        aggregates.set(key, {
          label: derived.label,
          total: 0,
          country: derived.country,
          city: derived.city,
          samples: [],
        });
      }

      const bucket = aggregates.get(key);
      bucket.total += scans;
      bucket.samples.push({
        scans,
        city: normalizeCityName(row.city),
        country: normalizeCountryName(row.country, regionFormatter),
      });
    });

    const sorted = Array.from(aggregates.values()).sort(
      (a, b) => b.total - a.total
    );
    const top = sorted.slice(0, 12);

    return {
      chart: [
        {
          data: top.map((entry) => ({
            x: entry.label,
            y: entry.total,
            meta: entry.samples,
          })),
        },
      ],
      entries: top,
      totalRegions: sorted.length,
    };
  }, [geoData, regionFormatter]);

  const geoSeries = geoBreakdown.chart;
  const geoLeaders = geoBreakdown.entries;

  const inventoryVelocitySeries = useMemo(() => {
    const velocity = inventorySummary?.data?.velocity || [];
    if (!inventorySummary?.available || !velocity.length) {
      return { categories: [], series: [] };
    }
    const groupedByDate = new Map();
    const roles = new Set();
    velocity.forEach((row) => {
      const dateKey = row.date;
      const roleKey = row.to_role || "unknown";
      roles.add(roleKey);
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, new Map());
      }
      const roleMap = groupedByDate.get(dateKey);
      roleMap.set(roleKey, Number(row.inbound_qty || 0));
    });

    const sortedDates = Array.from(groupedByDate.keys()).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    const rolesList = Array.from(roles);

    const series = rolesList.map((role) => ({
      name: role,
      data: sortedDates.map((date) => {
        const value = groupedByDate.get(date)?.get(role) || 0;
        return Number(value || 0);
      }),
    }));

    return {
      categories: sortedDates,
      series,
    };
  }, [inventorySummary]);

  const inventoryMatrix = useMemo(() => {
    const matrix = inventoryMoves?.data?.roleMatrix || [];
    if (!inventoryMoves?.available || !matrix.length) {
      return [];
    }
    return matrix.slice(0, 12).map((row) => ({
      key: `${row.from_role || "unknown"}->${row.to_role || "unknown"}`,
      from: row.from_role || "unknown",
      to: row.to_role || "unknown",
      qty: Number(row.qty || 0),
    }));
  }, [inventoryMoves]);

  const suspiciousTotals = suspiciousSummary?.data?.totals;
  const last24h = suspiciousSummary?.data?.last24h;
  const holdings = inventorySummary?.data?.holdings || [];
  const statusBreakdown = inventorySummary?.data?.statusBreakdown || [];
  const transferLeaders = inventorySummary?.data?.transferLeaders || [];
  const recentMoves = inventoryMoves?.data?.recent || [];

  const suspiciousRate = formatPercent(
    suspiciousTotals?.suspicious || 0,
    dashboardTotals?.scanCount || 0
  );
  const counterfeitRate = formatPercent(
    suspiciousTotals?.counterfeit || 0,
    dashboardTotals?.scanCount || 0
  );
  const authenticityRate = formatPercent(
    dashboardTotals?.authenticScanCount || 0,
    dashboardTotals?.scanCount || 0
  );
  const uniqueRegions = geoLeaders?.length || 0;
  const lastUpdatedDisplay = lastUpdated ? lastUpdated.toLocaleString() : "—";
  const metaSummary = [
    { label: "Last Sync", value: lastUpdatedDisplay },
    { label: "Authenticity", value: authenticityRate },
    { label: "Counterfeit", value: counterfeitRate },
    {
      label: "Geo Regions",
      value: uniqueRegions ? uniqueRegions.toString() : "—",
    },
  ];
  const showInitialLoad = loading && !dashboardTotals;
  const refreshButton = (
    <button
      type="button"
      onClick={handleRefresh}
      className={`${glassButtonClass} ${
        refreshing ? "cursor-wait opacity-70" : ""
      }`}
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
      title="Analytics Command Center"
      subtitle="Real-time operations intelligence across your product trust graph."
      meta={metaSummary}
      actions={refreshButton}
    >
      {error ? (
        <GlassCard className="mx-auto max-w-2xl space-y-4 p-10 text-center">
          <h2 className="text-2xl font-semibold text-white">
            Analytics unavailable
          </h2>
          <p className="text-white/70">{error}</p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRefresh}
              className={`${glassButtonClass} px-6`}
            >
              Retry load
            </button>
          </div>
        </GlassCard>
      ) : (
        <div className="w-full px-6 py-8 lg:px-10 xl:px-12 2xl:px-16">
          {showInitialLoad ? (
            <div className="flex h-40 items-center justify-center">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-10">
              <div className="rounded-3xl p-8 bg-gradient-to-br from-indigo-600/40 via-blue-600/30 to-emerald-500/20 border border-white/10 shadow-2xl">
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
                  <div>
                    <p className="uppercase tracking-widest text-sm text-white/60 font-semibold">
                      Network Health Snapshot
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold mt-2">
                      Real-time ProductGuard Performance
                    </h2>
                    <p className="text-white/70 mt-3 max-w-3xl">
                      Monitor product verification health, counterfeit hotspots,
                      and supply-chain velocity across your network with live
                      blockchain-aligned telemetry.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/60">
                      <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10">
                        Updated {lastUpdated.toLocaleString()}
                      </span>
                      <Link
                        to="/admin"
                        className="px-3 py-1 rounded-full bg-black/40 border border-white/10 hover:bg-black/60 transition"
                      >
                        ← Back to Admin Overview
                      </Link>
                    </div>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-xl w-full xl:w-80">
                    <p className="text-sm text-white/60 uppercase tracking-wide">
                      Counterfeit Pressure (30d)
                    </p>
                    <p className="text-4xl font-bold mt-2 text-amber-300">
                      {counterfeitRate}
                    </p>
                    <p className="text-white/60 text-sm mt-3 leading-relaxed">
                      {formatNumber(suspiciousTotals?.counterfeit)} flagged
                      counterfeit scans out of{" "}
                      {formatNumber(dashboardTotals?.scanCount)} total
                      verifications this month.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs text-white/70">
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <p className="font-semibold text-white text-lg">
                          {formatNumber(last24h?.suspicious)}
                        </p>
                        <p className="uppercase tracking-wide text-white/60">
                          Suspicious 24h
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <p className="font-semibold text-white text-lg">
                          {formatNumber(last24h?.counterfeit)}
                        </p>
                        <p className="uppercase tracking-wide text-white/60">
                          Confirmed Fraud 24h
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-10">
                <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl p-5 bg-black/40 border border-white/10 shadow-lg">
                    <p className="uppercase tracking-widest text-xs text-white/60">
                      Total Scans (30d)
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {formatNumber(dashboardTotals?.scanCount)}
                    </p>
                    <p className="text-sm text-white/50 mt-1">
                      Authentic:{" "}
                      {formatNumber(dashboardTotals?.authenticScanCount)}
                    </p>
                  </div>
                  <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 border border-white/10 shadow-lg">
                    <p className="uppercase tracking-widest text-xs text-white/70">
                      Suspicious Detection Rate
                    </p>
                    <p className="text-3xl font-bold mt-2 text-amber-200">
                      {suspiciousRate}
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      {formatNumber(suspiciousTotals?.suspicious)} anomalies
                      flagged
                    </p>
                  </div>
                  <div className="rounded-2xl p-5 bg-black/40 border border-indigo-500/30 shadow-lg">
                    <p className="uppercase tracking-widest text-xs text-white/60">
                      Active Users (by role)
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      {(dashboardTotals?.userCounts || []).map((row) => (
                        <div
                          key={row.role}
                          className="flex items-center justify-between"
                        >
                          <span className="capitalize text-white/70">
                            {row.role}
                          </span>
                          <span className="font-semibold text-white">
                            {formatNumber(row.count)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl p-5 bg-black/60 border border-emerald-500/30 shadow-lg">
                    <p className="uppercase tracking-widest text-xs text-white/60">
                      Counterfeit Impact
                    </p>
                    <p className="text-3xl font-bold mt-2 text-emerald-200">
                      {counterfeitRate}
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      {formatNumber(suspiciousTotals?.counterfeit)} counterfeit
                      signatures detected
                    </p>
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          Verification Timeline
                        </h2>
                        <p className="text-sm text-white/60">
                          Authentic vs counterfeit vs suspicious scans (30 days)
                        </p>
                      </div>
                    </div>
                    {scanSeries?.categories?.length ? (
                      <Chart
                        type="area"
                        height={320}
                        options={{
                          chart: {
                            type: "area",
                            foreColor: "#cbd5f5",
                            toolbar: { show: false },
                            background: "transparent",
                            stacked: true,
                          },
                          theme: { mode: "dark" },
                          stroke: { curve: "smooth", width: 2 },
                          dataLabels: { enabled: false },
                          fill: {
                            type: "gradient",
                            gradient: {
                              shadeIntensity: 1,
                              opacityFrom: 0.6,
                              opacityTo: 0.1,
                              stops: [0, 90, 100],
                            },
                          },
                          xaxis: {
                            categories: scanSeries?.categories || [],
                            labels: {
                              rotate: -45,
                              style: { colors: "#94a3b8" },
                            },
                            axisTicks: { show: false },
                            axisBorder: { show: false },
                          },
                          yaxis: {
                            labels: {
                              formatter: (val) => Math.round(val),
                              style: { colors: "#94a3b8" },
                            },
                          },
                          grid: {
                            borderColor: "rgba(148, 163, 184, 0.12)",
                            strokeDashArray: 4,
                          },
                          legend: {
                            position: "top",
                            horizontalAlign: "left",
                            labels: { colors: "#cbd5f5" },
                          },
                          tooltip: {
                            shared: true,
                            intersect: false,
                            theme: "dark",
                          },
                        }}
                        series={[
                          {
                            name: "Authentic",
                            data: scanSeries?.authentic || [],
                          },
                          {
                            name: "Suspicious",
                            data: scanSeries?.suspicious || [],
                          },
                          {
                            name: "Counterfeit",
                            data: scanSeries?.counterfeit || [],
                          },
                        ]}
                      />
                    ) : (
                      <div className="h-40 flex items-center justify-center text-white/50">
                        No scan data yet for this window.
                      </div>
                    )}
                  </div>
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold">
                        Suspicious Activity Pulse
                      </h2>
                      <p className="text-sm text-white/60">
                        Top drivers behind flagged scans
                      </p>
                      <ul className="mt-4 space-y-3 text-sm text-white/70">
                        {(suspiciousSummary?.data?.topReasons || []).map(
                          (reason) => (
                            <li
                              key={reason.reason}
                              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 border border-white/10"
                            >
                              <span className="pr-3">{reason.reason}</span>
                              <span className="font-semibold text-white">
                                {formatNumber(reason.count)}
                              </span>
                            </li>
                          )
                        )}
                        {!suspiciousSummary?.data?.topReasons?.length && (
                          <li className="text-white/50">
                            No suspicious activity detected.
                          </li>
                        )}
                      </ul>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                      <p className="uppercase text-xs tracking-widest text-white/60">
                        Last 30 days
                      </p>
                      <p className="text-3xl font-semibold mt-1">
                        {formatNumber(suspiciousTotals?.suspicious)} alerts
                      </p>
                      {suspiciousTrend.categories.length ? (
                        <Chart
                          type="area"
                          height={120}
                          options={{
                            chart: {
                              sparkline: { enabled: true },
                              background: "transparent",
                            },
                            stroke: { curve: "smooth", width: 2 },
                            fill: {
                              type: "gradient",
                              gradient: {
                                shadeIntensity: 1,
                                opacityFrom: 0.5,
                                opacityTo: 0.05,
                              },
                            },
                            colors: ["#fbbf24"],
                            tooltip: {
                              theme: "dark",
                              shared: false,
                              intersect: false,
                              y: {
                                formatter: (value) => `${value} alerts`,
                              },
                            },
                          }}
                          series={[
                            {
                              name: "Alerts",
                              data: suspiciousTrend.counts,
                            },
                          ]}
                        />
                      ) : (
                        <p className="text-white/50 mt-3">
                          Not enough data for trend.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl">
                    <h2 className="text-xl font-semibold">Login Reliability</h2>
                    <p className="text-sm text-white/60 mb-4">
                      Successful vs failed login attempts (30 days)
                    </p>
                    {loginSeries.categories.length ? (
                      <Chart
                        type="bar"
                        height={280}
                        options={{
                          chart: {
                            stacked: true,
                            toolbar: { show: false },
                            background: "transparent",
                          },
                          theme: { mode: "dark" },
                          plotOptions: {
                            bar: { horizontal: false, borderRadius: 6 },
                          },
                          dataLabels: { enabled: false },
                          xaxis: {
                            categories: loginSeries.categories,
                            labels: {
                              rotate: -45,
                              style: { colors: "#94a3b8" },
                            },
                            axisTicks: { show: false },
                            axisBorder: { show: false },
                          },
                          yaxis: {
                            labels: { style: { colors: "#94a3b8" } },
                          },
                          grid: {
                            borderColor: "rgba(148, 163, 184, 0.12)",
                            strokeDashArray: 4,
                          },
                          colors: ["#22c55e", "#ef4444"],
                          tooltip: {
                            shared: true,
                            intersect: false,
                            theme: "dark",
                          },
                        }}
                        series={[
                          { name: "Successful", data: loginSeries.success },
                          { name: "Failed", data: loginSeries.failure },
                        ]}
                      />
                    ) : (
                      <div className="h-32 flex items-center justify-center text-white/50">
                        No login activity.
                      </div>
                    )}
                  </div>
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl lg:col-span-2">
                    <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">
                          Inventory Velocity
                        </h2>
                        <p className="text-sm text-white/60">
                          Daily inbound volume by receiving role (45 days)
                        </p>
                      </div>
                      <Link
                        to="/inventory"
                        className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/40 hover:text-white"
                      >
                        Open inventory workspace
                      </Link>
                    </div>
                    {inventorySummary?.available &&
                    inventoryVelocitySeries.categories.length ? (
                      <Chart
                        type="area"
                        height={300}
                        options={{
                          chart: {
                            stacked: true,
                            toolbar: { show: false },
                            background: "transparent",
                          },
                          theme: { mode: "dark" },
                          stroke: { curve: "smooth", width: 2 },
                          dataLabels: { enabled: false },
                          fill: {
                            type: "gradient",
                            gradient: {
                              shadeIntensity: 1,
                              opacityFrom: 0.55,
                              opacityTo: 0.05,
                              stops: [0, 90, 100],
                            },
                          },
                          xaxis: {
                            categories: inventoryVelocitySeries.categories,
                            labels: {
                              rotate: -45,
                              style: { colors: "#94a3b8" },
                            },
                            axisTicks: { show: false },
                            axisBorder: { show: false },
                          },
                          yaxis: {
                            labels: {
                              formatter: (val) => Math.round(val),
                              style: { colors: "#94a3b8" },
                            },
                          },
                          legend: {
                            position: "top",
                            labels: { colors: "#cbd5f5" },
                          },
                          grid: {
                            borderColor: "rgba(148, 163, 184, 0.12)",
                            strokeDashArray: 4,
                          },
                          tooltip: {
                            shared: true,
                            intersect: false,
                            theme: "dark",
                          },
                        }}
                        series={inventoryVelocitySeries.series}
                      />
                    ) : (
                      <div className="h-32 flex items-center justify-center text-white/50">
                        Inventory activity data is not yet available.
                      </div>
                    )}
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-3 xl:grid-cols-12">
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl lg:col-span-1 xl:col-span-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">Geo Heatmap</h2>
                        <p className="text-sm text-white/60">
                          Most active scan regions (top 12)
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-widest text-white/40">
                        {geoBreakdown.totalRegions || 0} regions
                      </span>
                    </div>
                    {geoSeries.length && geoSeries[0]?.data?.length ? (
                      <>
                        <Chart
                          type="treemap"
                          height={280}
                          options={{
                            theme: { mode: "dark" },
                            chart: {
                              toolbar: { show: false },
                              background: "transparent",
                            },
                            colors: [
                              "#38bdf8",
                              "#2563eb",
                              "#0ea5e9",
                              "#7c3aed",
                            ],
                            plotOptions: {
                              treemap: {
                                enableShades: true,
                                shadeIntensity: 0.25,
                                distributed: true,
                              },
                            },
                            dataLabels: {
                              enabled: true,
                              style: {
                                colors: ["#0f172a"],
                                fontWeight: 700,
                              },
                              formatter: (text, opts) => {
                                const value = opts.value;
                                return `${text}: ${formatNumber(value)}`;
                              },
                            },
                            tooltip: {
                              theme: "dark",
                              custom: ({ seriesIndex, dataPointIndex, w }) => {
                                const value =
                                  w.globals.series[seriesIndex][dataPointIndex];
                                const label = w.globals.labels[dataPointIndex];
                                return `\n<div class="bg-slate-900/95 text-white text-xs px-3 py-2 rounded-lg border border-white/10">\n  <div class="font-semibold">${label}</div>\n  <div class="text-emerald-300 font-semibold">${formatNumber(
                                  value
                                )} scans</div>\n</div>\n`;
                              },
                            },
                          }}
                          series={geoSeries}
                        />
                        <div className="mt-6 space-y-2 text-sm text-white/70">
                          {geoLeaders.slice(0, 6).map((entry, idx) => (
                            <div
                              key={entry.label}
                              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2"
                            >
                              <span className="truncate pr-3">
                                {idx + 1}. {entry.label}
                              </span>
                              <span className="text-white font-semibold">
                                {formatNumber(entry.total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-white/50">
                        Geo enrichment not available for this window.
                      </div>
                    )}
                  </div>
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl lg:col-span-2 xl:col-span-7">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">
                        Top Counterfeit Brands
                      </h2>
                      <span className="text-sm text-white/60">
                        Last 30 days
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full text-sm">
                        <thead className="bg-white/5 text-white/60">
                          <tr>
                            <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                              Brand
                            </th>
                            <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                              Counterfeit Rate
                            </th>
                            <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                              Counterfeit Scans
                            </th>
                            <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                              Total Scans
                            </th>
                            <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                              Hot Serials
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {topCounterfeitBrands.length ? (
                            topCounterfeitBrands.map((row) => (
                              <tr
                                key={row.brand || row.serial_number || row.id}
                                className="hover:bg-white/5"
                              >
                                <td className="py-3 px-4 font-semibold text-white">
                                  {row.brand || "Unbranded Product"}
                                </td>
                                <td className="py-3 px-4 text-amber-300 font-medium">
                                  {Number(row.counterfeit_rate || 0).toFixed(2)}
                                  %
                                </td>
                                <td className="py-3 px-4 text-white/80">
                                  {formatNumber(row.counterfeit_scans)}
                                </td>
                                <td className="py-3 px-4 text-white/50">
                                  {formatNumber(row.total_scans)}
                                </td>
                                <td className="py-3 px-4">
                                  {Array.isArray(row.top_serials) &&
                                  row.top_serials.length ? (
                                    <div className="flex flex-wrap gap-2">
                                      {row.top_serials.map((serial) => (
                                        <span
                                          key={`${row.brand || "?"}-${
                                            serial.serial_number
                                          }`}
                                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80"
                                        >
                                          <span className="font-medium text-white">
                                            {serial.serial_number}
                                          </span>
                                          <span className="text-white/50">
                                            {formatNumber(
                                              serial.counterfeit_scans
                                            )}
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-white/40">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-5 px-4 text-center text-white/50"
                              >
                                No counterfeit activity detected.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl space-y-4">
                    <h2 className="text-xl font-semibold">
                      Inventory Holdings
                    </h2>
                    {inventorySummary?.available ? (
                      <div className="space-y-3">
                        {holdings.length ? (
                          holdings.map((row) => (
                            <div
                              key={row.owner_role}
                              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/10 text-sm"
                            >
                              <div>
                                <p className="text-white font-semibold capitalize">
                                  {row.owner_role}
                                </p>
                                <p className="text-white/60">
                                  {formatNumber(row.records)} records
                                </p>
                              </div>
                              <span className="text-lg font-semibold text-emerald-300">
                                {formatNumber(row.total_qty)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-white/50">
                            Inventory table is empty.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-white/50">
                        Inventory module not yet provisioned. Enable inventory
                        tracking to see live summaries here.
                      </p>
                    )}
                  </div>
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl space-y-4">
                    <h2 className="text-xl font-semibold">Status Breakdown</h2>
                    {inventorySummary?.available ? (
                      <div className="space-y-2 text-sm">
                        {statusBreakdown.length ? (
                          statusBreakdown.map((row) => (
                            <div key={row.status} className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 mr-3" />
                              <span className="capitalize text-white/70 flex-1">
                                {row.status}
                              </span>
                              <span className="font-semibold text-white">
                                {formatNumber(row.total_qty)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-white/50">
                            No inventory statuses recorded.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-white/50">
                        Add inventory flows to unlock status analytics.
                      </p>
                    )}
                  </div>
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl space-y-4">
                    <h2 className="text-xl font-semibold">
                      Top Transfer Destinations
                    </h2>
                    {inventorySummary?.available ? (
                      <div className="space-y-3 text-sm">
                        {transferLeaders.length ? (
                          transferLeaders.map((row) => (
                            <div
                              key={row.to_role}
                              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                            >
                              <span className="capitalize text-white/70">
                                {row.to_role}
                              </span>
                              <span className="text-white font-semibold">
                                {formatNumber(row.inbound_qty)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-white/50">
                            No transfer activity captured.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-white/50">
                        Inventory transfers will surface here once the module is
                        active.
                      </p>
                    )}
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl">
                    <h2 className="text-xl font-semibold">
                      Flow Matrix (45 days)
                    </h2>
                    {inventoryMoves?.available ? (
                      inventoryMatrix.length ? (
                        <ul className="space-y-3 text-sm">
                          {inventoryMatrix.map((row) => (
                            <li
                              key={row.key}
                              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                            >
                              <div>
                                <p className="text-white font-semibold capitalize">
                                  {row.from} → {row.to}
                                </p>
                                <p className="text-white/60">Role handoff</p>
                              </div>
                              <span className="text-white/80 font-semibold">
                                {formatNumber(row.qty)} units
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-white/50">
                          No inventory moves captured for this window.
                        </p>
                      )
                    ) : (
                      <p className="text-white/50">
                        Inventory moves tracking not enabled.
                      </p>
                    )}
                  </div>
                  <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl">
                    <h2 className="text-xl font-semibold">
                      Recent Inventory Moves
                    </h2>
                    {inventoryMoves?.available ? (
                      recentMoves.length ? (
                        <div className="overflow-hidden rounded-2xl border border-white/10">
                          <table className="w-full text-sm">
                            <thead className="bg-white/5 text-white/60">
                              <tr>
                                <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                                  Timestamp
                                </th>
                                <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                                  Serial
                                </th>
                                <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                                  Route
                                </th>
                                <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                                  Qty
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {recentMoves.map((row) => (
                                <tr key={row.id} className="hover:bg-white/5">
                                  <td className="py-3 px-4 text-white/60">
                                    {new Date(row.moved_at).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-white">
                                    {row.serial_number}
                                  </td>
                                  <td className="py-3 px-4 text-white/70">
                                    {(
                                      row.from_owner_role || "unknown"
                                    ).toLowerCase()}{" "}
                                    →{" "}
                                    {(
                                      row.to_owner_role || "unknown"
                                    ).toLowerCase()}
                                  </td>
                                  <td className="py-3 px-4 text-white font-semibold">
                                    {formatNumber(row.qty)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-white/50">
                          No inventory move records available.
                        </p>
                      )
                    ) : (
                      <p className="text-white/50">
                        Enable inventory moves to track handoffs here.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
};

export default AnalyticsDashboard;
