import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Chart from "react-apexcharts";
import { toast } from "react-hot-toast";
import { useConfig } from "../../context/ConfigContext";

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

const formatPercent = (num, den) => {
  if (!den) return "0%";
  const pct = (Number(num || 0) / Number(den)) * 100;
  if (Number.isNaN(pct)) return "0%";
  return `${pct.toFixed(1)}%`;
};

const AnalyticsDashboard = () => {
  const { apiBaseUrl } = useConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardTotals, setDashboardTotals] = useState(null);
  const [scanSeriesRaw, setScanSeriesRaw] = useState([]);
  const [loginSeriesRaw, setLoginSeriesRaw] = useState([]);
  const [suspiciousSummary, setSuspiciousSummary] = useState(null);
  const [topCounterfeit, setTopCounterfeit] = useState([]);
  const [geoData, setGeoData] = useState([]);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [inventoryMoves, setInventoryMoves] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
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

        setDashboardTotals(dashboardJson || null);
        setScanSeriesRaw(scansJson?.data || []);
        setLoginSeriesRaw(loginsJson?.data || []);
        setSuspiciousSummary(suspiciousJson || null);
        setTopCounterfeit(counterfeitJson?.data || []);
        setGeoData(geoJson?.data || []);
        setInventorySummary(inventorySummaryJson || null);
        setInventoryMoves(inventoryMovesJson || null);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Analytics dashboard load failed", err);
        setError(err.message || "Failed to load analytics");
        toast.error(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [apiBaseUrl]);

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

  const geoSeries = useMemo(() => {
    if (!geoData?.length) {
      return [];
    }
    const aggregated = geoData.reduce((acc, row) => {
      const country = row.country || "Unknown";
      acc[country] = (acc[country] || 0) + Number(row.scans || 0);
      return acc;
    }, {});
    const sorted = Object.entries(aggregated)
      .map(([country, scans]) => ({ country, scans }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 12);
    return [
      {
        data: sorted.map((entry) => ({ x: entry.country, y: entry.scans })),
      },
    ];
  }, [geoData]);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <div className="rounded-3xl p-8 bg-gradient-to-br from-indigo-600/40 via-blue-600/30 to-emerald-500/20 border border-white/10 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="uppercase tracking-widest text-sm text-white/60 font-semibold">
                Intelligence Console
              </p>
              <h1 className="text-4xl md:text-5xl font-bold mt-2">
                Real-time ProductGuard Performance
              </h1>
              <p className="text-white/70 mt-3 max-w-2xl">
                Monitor product verification health, counterfeit hotspots, and
                supply-chain velocity across your network with live
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
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-xl w-full lg:w-80">
              <p className="text-sm text-white/60 uppercase tracking-wide">
                Counterfeit Pressure (30d)
              </p>
              <p className="text-4xl font-bold mt-2 text-amber-300">
                {counterfeitRate}
              </p>
              <p className="text-white/60 text-sm mt-3 leading-relaxed">
                {formatNumber(suspiciousTotals?.counterfeit)} flagged
                counterfeit scans out of{" "}
                {formatNumber(dashboardTotals?.scanCount)} total verifications
                this month.
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

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-900/40 border border-red-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-red-200">
              Unable to load analytics
            </h2>
            <p className="text-red-200/80 mt-2">{error}</p>
          </div>
        ) : (
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
                  Authentic: {formatNumber(dashboardTotals?.authenticScanCount)}
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
                  {formatNumber(suspiciousTotals?.suspicious)} anomalies flagged
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
                {scanSeries.categories.length ? (
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
                        categories: scanSeries.categories,
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
                        data: scanSeries.authentic,
                      },
                      {
                        name: "Suspicious",
                        data: scanSeries.suspicious,
                      },
                      {
                        name: "Counterfeit",
                        data: scanSeries.counterfeit,
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
                        labels: { rotate: -45, style: { colors: "#94a3b8" } },
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Inventory Velocity
                    </h2>
                    <p className="text-sm text-white/60">
                      Daily inbound volume by receiving role (45 days)
                    </p>
                  </div>
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
                        labels: { rotate: -45, style: { colors: "#94a3b8" } },
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

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl">
                <h2 className="text-xl font-semibold">Geo Heatmap</h2>
                <p className="text-sm text-white/60 mb-4">
                  Most active scan regions (top 12)
                </p>
                {geoSeries.length ? (
                  <Chart
                    type="treemap"
                    height={280}
                    options={{
                      theme: { mode: "dark" },
                      chart: {
                        toolbar: { show: false },
                        background: "transparent",
                      },
                      colors: ["#38bdf8", "#2563eb", "#0ea5e9", "#7c3aed"],
                      plotOptions: {
                        treemap: {
                          enableShades: true,
                          shadeIntensity: 0.2,
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
                          return `${text}: ${value}`;
                        },
                      },
                      tooltip: {
                        theme: "dark",
                        y: {
                          formatter: (value) => `${value} scans`,
                        },
                      },
                    }}
                    series={geoSeries}
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center text-white/50">
                    Geo enrichment not available for this window.
                  </div>
                )}
              </div>
              <div className="rounded-3xl p-6 bg-black/40 border border-white/10 shadow-xl lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    Top Counterfeit Serials
                  </h2>
                  <span className="text-sm text-white/60">Last 30 days</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-white/60">
                      <tr>
                        <th className="text-left py-3 px-4 uppercase tracking-widest text-xs">
                          Serial
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {topCounterfeit.length ? (
                        topCounterfeit.map((row) => (
                          <tr
                            key={row.serial_number}
                            className="hover:bg-white/5"
                          >
                            <td className="py-3 px-4 font-semibold text-white">
                              {row.serial_number}
                            </td>
                            <td className="py-3 px-4 text-amber-300 font-medium">
                              {Number(row.counterfeit_rate || 0).toFixed(2)}%
                            </td>
                            <td className="py-3 px-4 text-white/80">
                              {formatNumber(row.counterfeit_scans)}
                            </td>
                            <td className="py-3 px-4 text-white/50">
                              {formatNumber(row.total_scans)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
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
                <h2 className="text-xl font-semibold">Inventory Holdings</h2>
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
                      <p className="text-white/50">Inventory table is empty.</p>
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
                <h2 className="text-xl font-semibold">Flow Matrix (45 days)</h2>
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
                                {(row.to_owner_role || "unknown").toLowerCase()}
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
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
