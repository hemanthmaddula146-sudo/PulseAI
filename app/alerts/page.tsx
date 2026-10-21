"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  ExternalLink,
  Flame,
  RefreshCw,
  Search,
  ShieldAlert,
  Waves,
  CloudLightning,
  Home, Map, Cloud, Settings, FileText, Menu, Zap,
} from "lucide-react";

type Earthquake = {
  id: string;
  properties: {
    mag: number | null;
    place: string;
    time: number;
    url: string;
    title: string;
  };
};

type NaturalEvent = {
  id?: string;
  title?: string;
  type?: string;
  category?: "flood" | "fire" | "storm" | "other" | string;
  date?: string | null;
  sourceUrl?: string | null;
};

type AlertItem = {
  id: string;
  title: string;
  location: string;
  category: "Earthquake" | "Wildfire" | "Flood" | "Severe weather" | "Other";
  severity: "Low" | "Moderate" | "High" | "Critical";
  timestamp: number | null;
  sourceUrl?: string | null;
  source: "USGS" | "NASA EONET";
};

const STORAGE_KEY = "pulseai-alerts-read-ids-v1";

function categoryForNaturalEvent(event: NaturalEvent): AlertItem["category"] {
  const text = `${event.category ?? ""} ${event.type ?? ""} ${event.title ?? ""}`.toLowerCase();
  if (/flood|inundation/.test(text)) return "Flood";
  if (/wild.?fire|fire|volcano/.test(text)) return "Wildfire";
  if (/storm|hurricane|cyclone|typhoon|tornado|severe weather/.test(text)) return "Severe weather";
  return "Other";
}

function severityForEarthquake(magnitude: number | null): AlertItem["severity"] {
  if (magnitude === null || !Number.isFinite(magnitude)) return "Moderate";
  if (magnitude >= 6.5) return "Critical";
  if (magnitude >= 5) return "High";
  if (magnitude >= 3.5) return "Moderate";
  return "Low";
}

function severityForNaturalEvent(category: AlertItem["category"]): AlertItem["severity"] {
  // Category-only estimates are intentionally conservative; they are not an official risk assessment.
  if (category === "Flood" || category === "Wildfire" || category === "Severe weather") return "Moderate";
  return "Low";
}

function severityClasses(severity: AlertItem["severity"]) {
  switch (severity) {
    case "Critical": return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "High": return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "Moderate": return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default: return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
}

function categoryIcon(category: AlertItem["category"]) {
  if (category === "Earthquake") return Activity;
  if (category === "Wildfire") return Flame;
  if (category === "Flood") return Waves;
  if (category === "Severe weather") return CloudLightning;
  return AlertTriangle;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [earthquakeError, setEarthquakeError] = useState("");
  const [naturalError, setNaturalError] = useState("");
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setReadIds(JSON.parse(stored));
    } catch {
      // Ignore invalid browser storage and continue with an empty read list.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
    } catch {
      // Storage may be disabled; alerts still work for this session.
    }
  }, [readIds]);

  const loadAlerts = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    const [quakeResult, naturalResult] = await Promise.allSettled([
      fetch("/api/earthquakes", { cache: "no-store" }),
      fetch("/api/natural-events", { cache: "no-store" }),
    ]);

    let quakeAlerts: AlertItem[] = [];
    let naturalAlerts: AlertItem[] = [];

    if (quakeResult.status === "fulfilled" && quakeResult.value.ok) {
      try {
        const data = await quakeResult.value.json();
        const earthquakes: Earthquake[] = Array.isArray(data.earthquakes) ? data.earthquakes : [];
        quakeAlerts = earthquakes.map((quake) => ({
          id: `usgs-${quake.id}`,
          title: quake.properties?.title || "Earthquake reported",
          location: quake.properties?.place || "Location not supplied by feed",
          category: "Earthquake",
          severity: severityForEarthquake(quake.properties?.mag ?? null),
          timestamp: Number.isFinite(quake.properties?.time) ? quake.properties.time : null,
          sourceUrl: quake.properties?.url,
          source: "USGS",
        }));
        setEarthquakeError("");
      } catch {
        setEarthquakeError("Could not parse the USGS earthquake response.");
      }
    } else {
      setEarthquakeError("USGS earthquake feed unavailable.");
    }

    if (naturalResult.status === "fulfilled" && naturalResult.value.ok) {
      try {
        const data = await naturalResult.value.json();
        const events: NaturalEvent[] = Array.isArray(data.events) ? data.events : [];
        naturalAlerts = events.map((event, index) => {
          const category = categoryForNaturalEvent(event);
          return {
            id: `nasa-${event.id || `${event.title || "event"}-${index}`}`,
            title: event.title || `${category} event reported`,
            location: event.type || event.category || "Location details not supplied by feed",
            category,
            severity: severityForNaturalEvent(category),
            timestamp: event.date ? Date.parse(event.date) || null : null,
            sourceUrl: event.sourceUrl,
            source: "NASA EONET",
          };
        });
        setNaturalError(data.error ? String(data.error) : "");
      } catch {
        setNaturalError("Could not parse the NASA EONET response.");
      }
    } else {
      setNaturalError("NASA EONET natural-event feed unavailable.");
    }

    setAlerts([...quakeAlerts, ...naturalAlerts].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
    setLastUpdated(Date.now());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadAlerts();
    const interval = window.setInterval(() => void loadAlerts(), 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loadAlerts]);

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesQuery = !normalizedQuery || `${alert.title} ${alert.location} ${alert.category} ${alert.source}`.toLowerCase().includes(normalizedQuery);
      const matchesSeverity = severityFilter === "All" || alert.severity === severityFilter;
      const matchesCategory = categoryFilter === "All" || alert.category === categoryFilter;
      const matchesUnread = !unreadOnly || !readIds.includes(alert.id);
      return matchesQuery && matchesSeverity && matchesCategory && matchesUnread;
    });
  }, [alerts, query, severityFilter, categoryFilter, unreadOnly, readIds]);

  const unreadCount = alerts.filter((alert) => !readIds.includes(alert.id)).length;
  const criticalCount = alerts.filter((alert) => alert.severity === "Critical").length;
  const highCount = alerts.filter((alert) => alert.severity === "High").length;

  function markRead(id: string) {
    setReadIds((current) => current.includes(id) ? current : [...current, id]);
  }

  function markAllRead() {
    setReadIds((current) => [...new Set([...current, ...alerts.map((alert) => alert.id)])]);
  }

  const sidebarItems = [
    { name: "Dashboard", icon: Home, href: "/" },
    { name: "Live Map", icon: Map, href: "/?view=Live%20Map" },
    { name: "Earthquakes", icon: Activity, href: "/?view=Earthquakes" },
    { name: "Weather", icon: Cloud, href: "/?view=Weather" },
    { name: "Natural Events", icon: Flame, href: "/?view=Natural%20Events" },
    { name: "Alerts", icon: Bell, href: "/alerts" },
    { name: "AI Assistant", icon: ShieldAlert, href: "/?view=AI%20Assistant" },
    { name: "Reports", icon: FileText, href: "/?view=Reports" },
    { name: "Settings", icon: Settings, href: "/?view=Settings" },
  ];

  return (
    <main className="min-h-screen bg-[#070d18] text-slate-100">
      <header className="sticky top-0 z-30 flex h-[78px] items-center gap-3 border-b border-slate-800 bg-[#090f1b] px-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><Activity size={27} /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">Pulse<span className="text-cyan-400">AI</span></h1><p className="text-xs text-slate-400">Real-Time Disaster Intelligence</p></div>
      </header>
      <div className="flex min-h-[calc(100vh-78px)]">
        <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-[#09111e] p-4 lg:block">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = item.name === "Alerts";
              return <a key={item.name} href={item.href} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active ? "bg-cyan-500/15 font-semibold text-cyan-400" : "text-slate-400 hover:bg-slate-500/10 hover:text-cyan-400"}`}><Icon size={18} />{item.name}{active && <span className="ml-auto rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">{unreadCount > 99 ? "99+" : unreadCount}</span>}</a>;
            })}
          </nav>
          <div className="mt-10 rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-cyan-400"><Zap size={18} /><span className="text-sm font-semibold">PulseAI Engine</span></div>
            <p className="text-xs leading-5 text-slate-400">AI-powered event intelligence will be connected in the next development stage.</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-500/20"><div className="h-full w-2/3 rounded-full bg-cyan-500" /></div>
            <p className="mt-2 text-[10px] text-slate-500">Interface preview</p>
          </div>
        </aside>
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <ShieldAlert size={16} /> PulseAI · Operations Center
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hazard Alerts</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Monitor event reports from USGS and NASA EONET. Severity labels are rule-based estimates, not official warnings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadAlerts(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium transition hover:border-cyan-500/50 disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh feeds
            </button>
            <button onClick={markAllRead} className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/15">
              <CheckCheck size={16} /> Mark all read
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Reported events", value: loading ? "…" : alerts.length, icon: Activity, color: "text-cyan-300" },
            { label: "Unread alerts", value: loading ? "…" : unreadCount, icon: Bell, color: "text-sky-300" },
            { label: "High severity", value: loading ? "…" : highCount, icon: AlertTriangle, color: "text-orange-300" },
            { label: "Critical severity", value: loading ? "…" : criticalCount, icon: ShieldAlert, color: "text-rose-300" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-800 bg-[#0d1726] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <Icon size={19} className={card.color} />
                </div>
                <p className="mt-3 text-3xl font-bold">{card.value}</p>
              </div>
            );
          })}
        </section>

        {(earthquakeError || naturalError) && (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
            <p className="font-semibold">Some data feeds need attention</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-amber-100/80">
              {earthquakeError && <li>{earthquakeError}</li>}
              {naturalError && <li>{naturalError}</li>}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-[#0d1726] p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_190px_auto]">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-[#08111e] px-3 py-2.5">
              <Search size={17} className="text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, location, or source..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" />
            </label>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-[#08111e] px-3 py-2.5 text-sm outline-none">
              <option>All</option><option>Critical</option><option>High</option><option>Moderate</option><option>Low</option>
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-[#08111e] px-3 py-2.5 text-sm outline-none">
              <option>All</option><option>Earthquake</option><option>Wildfire</option><option>Flood</option><option>Severe weather</option><option>Other</option>
            </select>
            <button onClick={() => setUnreadOnly((value) => !value)} className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${unreadOnly ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200" : "border-slate-700 bg-[#08111e] text-slate-300"}`}>
              {unreadOnly ? "Showing unread" : "Unread only"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <p>{loading ? "Loading event feeds…" : `Showing ${filteredAlerts.length} of ${alerts.length} reported events`}</p>
            <p>{lastUpdated ? `Last checked ${new Date(lastUpdated).toLocaleTimeString()}` : "Waiting for feed response"} · Auto-refresh every 5 minutes</p>
          </div>
        </section>

        <section className="space-y-3">
          {!loading && filteredAlerts.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-[#0d1726] px-6 py-14 text-center">
              <Bell size={28} className="mx-auto text-slate-500" />
              <h2 className="mt-3 font-semibold">No matching alerts</h2>
              <p className="mt-1 text-sm text-slate-400">Try another filter or refresh the connected feeds.</p>
            </div>
          )}

          {filteredAlerts.map((alert) => {
            const Icon = categoryIcon(alert.category);
            const isRead = readIds.includes(alert.id);
            return (
              <article key={alert.id} className={`rounded-2xl border bg-[#0d1726] p-4 transition sm:p-5 ${isRead ? "border-slate-800 opacity-75" : "border-cyan-500/20"}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-cyan-300"><Icon size={21} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-300">{alert.category}</span>
                      <span className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${severityClasses(alert.severity)}`}>{alert.severity} · estimated</span>
                      {!isRead && <span className="rounded-lg bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-300">UNREAD</span>}
                    </div>
                    <h2 className="mt-2 break-words font-semibold">{alert.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">{alert.location}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Source: {alert.source} · {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : "Event time not supplied"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    {!isRead && <button onClick={() => markRead(alert.id)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200">Mark read</button>}
                    {alert.sourceUrl && <a href={alert.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-cyan-300 transition hover:border-cyan-500/40">Source <ExternalLink size={13} /></a>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer className="border-t border-slate-800 py-4 text-xs leading-5 text-slate-500">
          PulseAI aggregates external event feeds. Estimated severity is a demonstration aid only and must not be used as a substitute for official emergency guidance.
        </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
