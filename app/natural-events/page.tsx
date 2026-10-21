"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bell, Brain, Cloud, ExternalLink, FileText, Flame, Home, Map, RefreshCw, Search, Settings, Shield, Waves, Wind } from "lucide-react";

type NaturalEvent = {
  id: string;
  title: string;
  type: string;
  category: "flood" | "fire" | "storm" | "other";
  coordinates: [number, number];
  date: string | null;
  sourceUrl: string | null;
};

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Live Map", href: "/?view=map", icon: Map },
  { name: "Earthquakes", href: "/earthquakes", icon: Activity },
  { name: "Weather", href: "/weather", icon: Cloud },
  { name: "Natural Events", href: "/natural-events", icon: Flame },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "AI Assistant", href: "/", icon: Brain },
  { name: "Reports", href: "/", icon: FileText },
  { name: "Settings", href: "/", icon: Settings },
];

const categoryStyle: Record<NaturalEvent["category"], string> = {
  flood: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  fire: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  storm: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  other: "border-slate-600 bg-slate-700/30 text-slate-300",
};

function categoryIcon(category: NaturalEvent["category"]) {
  if (category === "flood") return Waves;
  if (category === "fire") return Flame;
  if (category === "storm") return Wind;
  return AlertTriangle;
}

export default function NaturalEventsPage() {
  const [events, setEvents] = useState<NaturalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadEvents = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch("/api/natural-events", { cache: "no-store" });
      if (!response.ok) throw new Error("Natural events feed unavailable");
      const data = await response.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setError("");
      setLastUpdated(Date.now());
    } catch {
      setError("Could not load the natural events feed. Check the API route or try refreshing.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
    const timer = window.setInterval(() => void loadEvents(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [loadEvents]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesQuery = `${event.title} ${event.type} ${event.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "all" || event.category === category);
  }), [events, query, category]);

  const count = (key: NaturalEvent["category"]) => events.filter((event) => event.category === key).length;

  return (
    <main className="min-h-screen bg-[#070d18] text-slate-100">
      <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between gap-4 border-b border-slate-800 bg-[#090f1b] px-5 md:px-8">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><Shield size={27}/></div><div><h1 className="text-2xl font-bold">Pulse<span className="text-cyan-400">AI</span></h1><p className="hidden text-xs text-slate-400 sm:block">Real-Time Disaster Intelligence</p></div></div>
        <div className="hidden items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-400 md:flex"><Flame size={16} className="text-orange-300"/> NASA natural events feed</div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-cyan-300"><Bell size={19}/></div>
      </header>
      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-78px)] w-60 shrink-0 border-r border-slate-800 bg-[#09111e] p-4 lg:block">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
          <nav className="space-y-1">{navigation.map((item) => { const Icon = item.icon; const active = item.name === "Natural Events"; return <a key={item.name} href={item.href} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active ? "bg-cyan-500/15 font-semibold text-cyan-400" : "text-slate-400 hover:bg-slate-500/10 hover:text-cyan-400"}`}><Icon size={18}/>{item.name}{item.name === "Alerts" && <span className="ml-auto rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">!</span>}</a>; })}</nav>
          <div className="mt-10 rounded-2xl border border-orange-900/60 bg-orange-950/20 p-4"><div className="mb-3 flex items-center gap-2 text-orange-300"><Flame size={18}/><span className="text-sm font-semibold">Natural Event Watch</span></div><p className="text-xs leading-5 text-slate-400">Events are loaded from the connected feed and refreshed automatically every five minutes.</p><p className="mt-3 text-[10px] text-slate-500">Informational data, not an official emergency warning service.</p></div>
        </aside>
        <section className="min-w-0 flex-1 p-4 md:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1.5 text-xs font-medium text-orange-300"><Flame size={14}/> LIVE NATURAL EVENT MONITOR</div><h2 className="text-3xl font-bold tracking-tight">Natural Events</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Explore reported floods, fires, storms, and other natural events from the connected NASA EONET feed.</p></div><button onClick={() => void loadEvents(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm transition hover:border-cyan-500/50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Refreshing…" : "Refresh feed"}</button></div>
          {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"><AlertTriangle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4"><div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-5"><p className="text-sm text-slate-400">Total events</p><p className="mt-2 text-3xl font-bold">{loading ? "…" : error ? "—" : events.length}</p><p className="mt-2 text-xs text-slate-500">Records returned by feed</p></div><div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-5"><p className="text-sm text-slate-400">Flood-related</p><p className="mt-2 text-3xl font-bold text-blue-300">{loading ? "…" : count("flood")}</p></div><div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-5"><p className="text-sm text-slate-400">Fire / volcano</p><p className="mt-2 text-3xl font-bold text-orange-300">{loading ? "…" : count("fire")}</p></div><div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-5"><p className="text-sm text-slate-400">Storm-related</p><p className="mt-2 text-3xl font-bold text-violet-300">{loading ? "…" : count("storm")}</p></div></div>
          <div className="mb-5 rounded-2xl border border-slate-800 bg-[#0e1726] p-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]"><label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#08111e] px-4 py-3"><Search size={17} className="text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event title or type…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"/></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-700 bg-[#08111e] px-3 py-3 text-sm outline-none"><option value="all">All categories</option><option value="flood">Flood</option><option value="fire">Fire / volcano</option><option value="storm">Storm</option><option value="other">Other</option></select></div><p className="mt-3 text-xs text-slate-500">Showing {filteredEvents.length} of {events.length} events{lastUpdated ? ` · Last updated ${new Date(lastUpdated).toLocaleTimeString()}` : ""}</p></div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{loading && <div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-8 text-center text-sm text-slate-400 xl:col-span-2">Loading natural events…</div>}{!loading && !error && filteredEvents.map((event) => { const Icon = categoryIcon(event.category); return <article key={event.id} className="rounded-2xl border border-slate-800 bg-[#0e1726] p-5 transition hover:border-slate-700"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-orange-300"><Icon size={21}/></div><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${categoryStyle[event.category]}`}>{event.category}</span><span className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{event.type || "Natural event"}</span></div><h3 className="break-words font-semibold leading-6">{event.title || "Natural event reported"}</h3><p className="mt-2 text-xs text-slate-500">{event.date ? new Date(event.date).toLocaleString() : "Date not provided by source"}</p><p className="mt-2 text-xs text-slate-500">Coordinates: {event.coordinates?.[0]?.toFixed(3) ?? "—"}, {event.coordinates?.[1]?.toFixed(3) ?? "—"}</p>{event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-300 hover:text-cyan-200">Open source details <ExternalLink size={13}/></a>}</div></div></article>; })}{!loading && !error && filteredEvents.length === 0 && <div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-10 text-center xl:col-span-2"><Search size={24} className="mx-auto mb-3 text-slate-500"/><p className="font-medium">No matching natural events</p><p className="mt-1 text-sm text-slate-500">Try a different search or category filter.</p></div>}</div>
          <footer className="mt-8 border-t border-slate-800 py-5 text-xs text-slate-500">PulseAI · Connected natural events feed · Refreshes automatically every five minutes · Informational only, not an official emergency warning.</footer>
        </section>
      </div>
    </main>
  );
}
