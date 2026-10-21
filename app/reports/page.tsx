"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  LayoutDashboard,
  Map,
  Mountain,
  CloudSun,
  Bell,
  Bot,
  FileText,
  Settings,
  ShieldAlert,
  Search,
  RefreshCw,
  ExternalLink,
  CalendarDays,
  AlertTriangle,
  Flame,
  Waves,
  CloudLightning,
} from "lucide-react";

type Earthquake = {
  id: string;
  title: string;
  magnitude?: number;
  place?: string;
  time?: number;
  url?: string;
  coordinates?: [number, number, number];
};

type NaturalEvent = {
  id: string;
  title: string;
  type?: string;
  category?: string;
  date?: string;
  sourceUrl?: string;
  coordinates?: [number, number];
};

type Report = {
  id: string;
  title: string;
  category: string;
  source: string;
  date: string;
  url?: string;
  magnitude?: number;
  location?: string;
};

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Live Map", href: "/?view=map", icon: Map },
  { name: "Earthquakes", href: "/earthquakes", icon: Mountain },
  { name: "Weather", href: "/weather", icon: CloudSun },
  { name: "Natural Events", href: "/natural-events", icon: Activity },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

function formatDate(value?: string | number) {
  if (!value) return "Date unavailable";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString();
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadReports = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [earthquakeResponse, naturalResponse] = await Promise.all([
        fetch("/api/earthquakes", { cache: "no-store" }),
        fetch("/api/natural-events", { cache: "no-store" }),
      ]);

      if (!earthquakeResponse.ok) {
        throw new Error("Could not load earthquake data.");
      }
      if (!naturalResponse.ok) {
        throw new Error("Could not load natural events data.");
      }

      const earthquakeData = await earthquakeResponse.json();
      const naturalData = await naturalResponse.json();

      const earthquakeItems: Earthquake[] = Array.isArray(earthquakeData)
        ? earthquakeData
        : Array.isArray(earthquakeData?.earthquakes)
          ? earthquakeData.earthquakes
          : Array.isArray(earthquakeData?.features)
            ? earthquakeData.features.map((feature: any) => ({
                id: feature.id,
                title: feature.properties?.title ?? "Earthquake",
                magnitude: feature.properties?.mag,
                place: feature.properties?.place,
                time: feature.properties?.time,
                url: feature.properties?.url,
                coordinates: feature.geometry?.coordinates,
              }))
            : [];

      const naturalItems: NaturalEvent[] = Array.isArray(naturalData?.events)
        ? naturalData.events
        : Array.isArray(naturalData)
          ? naturalData
          : [];

      const mappedEarthquakes: Report[] = earthquakeItems.map((item) => ({
        id: `quake-${item.id}`,
        title: item.title || "Earthquake event",
        category: "Earthquake",
        source: "USGS",
        date: formatDate(item.time),
        url: item.url,
        magnitude: item.magnitude,
        location: item.place,
      }));

      const mappedNatural: Report[] = naturalItems.map((item) => ({
        id: `natural-${item.id}`,
        title: item.title || "Natural event",
        category: item.category || item.type || "Natural Event",
        source: "NASA EONET",
        date: formatDate(item.date),
        url: item.sourceUrl,
        location: item.coordinates
          ? `${item.coordinates[0].toFixed(2)}, ${item.coordinates[1].toFixed(2)}`
          : undefined,
      }));

      const combined = [...mappedEarthquakes, ...mappedNatural].sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return (Number.isFinite(bTime) ? bTime : 0) -
          (Number.isFinite(aTime) ? aTime : 0);
      });

      setReports(combined);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Reports loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reports. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(reports.map((report) => report.category))).sort()],
    [reports]
  );

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        report.title.toLowerCase().includes(query) ||
        report.category.toLowerCase().includes(query) ||
        (report.location || "").toLowerCase().includes(query) ||
        report.source.toLowerCase().includes(query);
      const matchesCategory = category === "All" || report.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [reports, search, category]);

  const earthquakeCount = reports.filter((r) => r.category === "Earthquake").length;
  const naturalCount = reports.length - earthquakeCount;

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-white/10 bg-[#0b1220]">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
          <div className="rounded-xl bg-cyan-400/15 p-2 text-cyan-300">
            <ShieldAlert size={25} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">PulseAI</h1>
            <p className="text-xs text-slate-400">Disaster Intelligence</p>
          </div>
        </div>

        <div className="px-5 pb-3 pt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Workspace
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.name === "Reports";
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  active
                    ? "bg-cyan-400/10 font-semibold text-cyan-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Data-connected reports
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Reports are assembled from the existing USGS and NASA event feeds.
          </p>
        </div>
      </aside>

      <main className="ml-64 min-h-screen">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              PulseAI Workspace
            </p>
            <h2 className="mt-2 text-2xl font-bold">Reports Center</h2>
            <p className="mt-1 text-sm text-slate-400">
              Explore recent earthquakes and natural events from connected feeds.
            </p>
          </div>
          <button
            onClick={() => void loadReports(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh reports"}
          </button>
        </header>

        <section className="space-y-6 p-8">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load all reports</p>
                <p className="mt-1">{error}</p>
                <button
                  onClick={() => void loadReports(true)}
                  className="mt-3 underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Reports"
              value={loading ? "—" : reports.length.toLocaleString()}
              subtitle="Combined connected feeds"
              icon={<FileText size={20} />}
            />
            <StatCard
              title="Earthquake Reports"
              value={loading ? "—" : earthquakeCount.toLocaleString()}
              subtitle="Source: USGS"
              icon={<Mountain size={20} />}
            />
            <StatCard
              title="Natural Event Reports"
              value={loading ? "—" : naturalCount.toLocaleString()}
              subtitle="Source: NASA EONET"
              icon={<Waves size={20} />}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1524] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Event reports</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {loading
                    ? "Loading events..."
                    : `${filteredReports.length} of ${reports.length} reports shown`}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
                  <Search size={17} className="text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, source, location..."
                    className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-500 sm:w-64"
                  />
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="rounded-xl border border-white/10 bg-[#111b2b] px-3 py-2.5 text-sm outline-none"
                  aria-label="Filter reports by category"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-4 font-medium">Report</th>
                    <th className="px-3 py-4 font-medium">Category</th>
                    <th className="px-3 py-4 font-medium">Source</th>
                    <th className="px-3 py-4 font-medium">Date</th>
                    <th className="px-3 py-4 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center text-sm text-slate-400">
                        Loading connected event feeds...
                      </td>
                    </tr>
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-12 text-center text-sm text-slate-400">
                        No reports match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr
                        key={report.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.025]"
                      >
                        <td className="px-3 py-4">
                          <div className="max-w-sm font-medium text-slate-200">
                            {report.title}
                          </div>
                          {report.location && (
                            <div className="mt-1 text-xs text-slate-500">
                              {report.location}
                            </div>
                          )}
                          {typeof report.magnitude === "number" && (
                            <div className="mt-1 text-xs text-amber-300">
                              Magnitude {report.magnitude.toFixed(1)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1 text-xs text-cyan-200">
                            {report.category === "Wildfires" || report.category === "fire" ? (
                              <Flame size={13} />
                            ) : report.category === "storm" ? (
                              <CloudLightning size={13} />
                            ) : (
                              <Activity size={13} />
                            )}
                            {report.category}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-slate-400">{report.source}</td>
                        <td className="px-3 py-4 text-sm text-slate-400">{report.date}</td>
                        <td className="px-3 py-4">
                          {report.url ? (
                            <a
                              href={report.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200"
                            >
                              Open <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-600">No link</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={14} />
                Last updated: {lastUpdated || "Waiting for data"}
              </span>
              <span>Data is supplied by connected event feeds; availability may vary.</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1524] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-cyan-300">
          {icon}
        </div>
      </div>
    </div>
  );
}
