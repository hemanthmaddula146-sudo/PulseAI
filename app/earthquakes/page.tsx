"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bell, Cloud, FileText, Flame, Home, Map, RefreshCw, Search, Settings, Shield, Waves, Brain, Menu, ExternalLink } from "lucide-react";

type Earthquake = {
  id: string;
  properties: { mag: number | null; place: string; time: number; url: string; title: string };
  geometry?: { coordinates?: number[] };
};

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Live Map", href: "/?view=map", icon: Map },
  { name: "Earthquakes", href: "/earthquakes", icon: Activity },
  { name: "Weather", href: "/", icon: Cloud },
  { name: "Natural Events", href: "/", icon: Flame },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "AI Assistant", href: "/", icon: Brain },
  { name: "Reports", href: "/", icon: FileText },
  { name: "Settings", href: "/", icon: Settings },
];

function magnitudeStyle(mag: number | null) {
  if (mag === null) return "border-slate-600 bg-slate-700/30 text-slate-300";
  if (mag >= 6) return "border-rose-500/40 bg-rose-500/10 text-rose-300";
  if (mag >= 4.5) return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  if (mag >= 3) return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
}

export default function EarthquakesPage() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [minimumMagnitude, setMinimumMagnitude] = useState("All");
  const [sortOrder, setSortOrder] = useState("latest");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadEarthquakes = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch("/api/earthquakes", { cache: "no-store" });
      if (!response.ok) throw new Error("Earthquake feed unavailable");
      const data = await response.json();
      setEarthquakes(Array.isArray(data.earthquakes) ? data.earthquakes : []);
      setError("");
      setLastUpdated(Date.now());
    } catch {
      setError("Could not load the live USGS earthquake feed. Please try refreshing in a moment.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEarthquakes();
    const timer = window.setInterval(() => void loadEarthquakes(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [loadEarthquakes]);

  const filteredEarthquakes = useMemo(() => {
    const list = earthquakes.filter((quake) => {
      const mag = quake.properties.mag;
      const matchesQuery = `${quake.properties.title ?? ""} ${quake.properties.place ?? ""}`.toLowerCase().includes(query.toLowerCase());
      const matchesMagnitude = minimumMagnitude === "All" || (mag !== null && mag >= Number(minimumMagnitude));
      return matchesQuery && matchesMagnitude;
    });
    return list.sort((a, b) => sortOrder === "magnitude"
      ? (b.properties.mag ?? -1) - (a.properties.mag ?? -1)
      : b.properties.time - a.properties.time);
  }, [earthquakes, query, minimumMagnitude, sortOrder]);

  const highMagnitudeCount = earthquakes.filter((quake) => (quake.properties.mag ?? 0) >= 4.5).length;
  const strongest = earthquakes.reduce<Earthquake | null>((best, quake) => !best || (quake.properties.mag ?? -1) > (best.properties.mag ?? -1) ? quake : best, null);

  return (
    <main className="min-h-screen bg-[#070d18] text-slate-100">
      <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between gap-4 border-b border-slate-800 bg-[#090f1b] px-5 md:px-8">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><Activity size={28} /></div><div><h1 className="text-2xl font-bold">Pulse<span className="text-cyan-400">AI</span></h1><p className="hidden text-xs text-slate-400 sm:block">Real-Time Disaster Intelligence</p></div></div>
        <div className="hidden items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-400 md:flex"><Shield size={16} className="text-cyan-400" /> Live USGS earthquake data</div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-cyan-300"><Bell size={19} /></div>
      </header>
      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-78px)] w-60 shrink-0 border-r border-slate-800 bg-[#09111e] p-4 lg:block">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
          <nav className="space-y-1">{navigation.map((item) => { const Icon = item.icon; const active = item.name === "Earthquakes"; return <a key={item.name} href={item.href} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active ? "bg-cyan-500/15 font-semibold text-cyan-400" : "text-slate-400 hover:bg-slate-500/10 hover:text-cyan-400"}`}><Icon size={18} />{item.name}{item.name === "Alerts" && <span className="ml-auto rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">!</span>}</a>; })}</nav>
          <div className="mt-10 rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-4"><div className="mb-3 flex items-center gap-2 text-cyan-400"><Activity size={18}/><span className="text-sm font-semibold">Earthquake Monitor</span></div><p className="text-xs leading-5 text-slate-400">USGS feed refreshes automatically every five minutes.</p><p className="mt-3 text-[10px] text-slate-500">Informational data, not an official warning service.</p></div>
        </aside>
        <section className="min-w-0 flex-1 p-4 md:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300"><Activity size={14}/> LIVE EARTHQUAKE MONITOR</div><h2 className="text-3xl font-bold tracking-tight">Earthquakes</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Monitor earthquake reports returned by the connected USGS feed. Magnitude labels are simple reference categories, not predictions.</p></div><button onClick={() => void loadEarthquakes(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm transition hover:border-cyan-500/50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Refreshing…" : "Refresh feed"}</button></div>
          {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"><AlertTriangle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-5"><p className="text-sm text-slate-400">Reported earthquakes</p><p className="mt-2 text-3xl font-bold">{loading ? "…" : error ? "—" : earthquakes.length}</p><p className="mt-2 text-xs text-slate-500">Records returned by USGS API</p></div><div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-5"><p className="text-sm text-slate-400">Magnitude 4.5+</p><p className="mt-2 text-3xl font-bold text-orange-300">{loading ? "…" : error ? "—" : highMagnitudeCount}</p><p className="mt-2 text-xs text-slate-500">Based on reported magnitude</p></div><div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-5"><p className="text-sm text-slate-400">Strongest in feed</p><p className="mt-2 text-3xl font-bold text-rose-300">{loading ? "…" : error ? "—" : strongest?.properties.mag ?? "N/A"}</p><p className="mt-2 truncate text-xs text-slate-500">{strongest?.properties.place ?? "No location available"}</p></div></div>
          <div className="mb-5 rounded-2xl border border-slate-800 bg-[#0e1726] p-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px_190px]"><label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#08111e] px-4 py-3"><Search size={17} className="text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by location or event title…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"/></label><select value={minimumMagnitude} onChange={(event) => setMinimumMagnitude(event.target.value)} className="rounded-xl border border-slate-700 bg-[#08111e] px-3 py-3 text-sm outline-none"><option value="All">All magnitudes</option><option value="2">Magnitude 2.0+</option><option value="3">Magnitude 3.0+</option><option value="4.5">Magnitude 4.5+</option><option value="6">Magnitude 6.0+</option></select><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="rounded-xl border border-slate-700 bg-[#08111e] px-3 py-3 text-sm outline-none"><option value="latest">Latest first</option><option value="magnitude">Strongest first</option></select></div><p className="mt-3 text-xs text-slate-500">Showing {filteredEarthquakes.length} of {earthquakes.length} returned reports{lastUpdated ? ` · Last updated ${new Date(lastUpdated).toLocaleTimeString()}` : ""}</p></div>
          <div className="space-y-3">{loading && <div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-8 text-center text-sm text-slate-400">Loading earthquake reports…</div>}{!loading && !error && filteredEarthquakes.map((quake) => <article key={quake.id} className="rounded-2xl border border-slate-800 bg-[#0e1726] p-4 md:p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex min-w-0 gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300"><Activity size={21}/></div><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${magnitudeStyle(quake.properties.mag)}`}>Magnitude {quake.properties.mag ?? "unknown"}</span><span className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400">USGS report</span></div><h3 className="break-words font-semibold">{quake.properties.title || "Earthquake reported"}</h3><p className="mt-1 text-sm text-slate-400">{quake.properties.place || "Location not provided"}</p><p className="mt-2 text-xs text-slate-500">{Number.isFinite(quake.properties.time) ? new Date(quake.properties.time).toLocaleString() : "Time unavailable"}</p></div></div>{quake.properties.url && <a href={quake.properties.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-700 px-3 py-2 text-xs text-cyan-300 transition hover:border-cyan-500/50">USGS details <ExternalLink size={14}/></a>}</div></article>)}{!loading && !error && filteredEarthquakes.length === 0 && <div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-10 text-center"><Search size={24} className="mx-auto mb-3 text-slate-500"/><p className="font-medium">No matching earthquake reports</p><p className="mt-1 text-sm text-slate-500">Try changing the search or magnitude filter.</p></div>}</div>
          <footer className="mt-8 border-t border-slate-800 py-5 text-xs text-slate-500">PulseAI · USGS earthquake feed · Refreshes automatically every five minutes · Informational only, not an official emergency warning.</footer>
        </section>
      </div>
    </main>
  );
}
