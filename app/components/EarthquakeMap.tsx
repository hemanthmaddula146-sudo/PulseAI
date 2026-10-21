"use client";

import {useEffect, useMemo, useState, useRef} from "react";
import L, { divIcon, type LatLngExpression } from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

type Quake = {
  id: string;
  properties: { mag: number | null; place: string; time: number; url: string; title: string };
  geometry: { coordinates: number[] };
};
type DisasterType = "earthquake" | "flood" | "fire" | "storm" | "other";
type NaturalEvent = {
  id: string;
  title: string;
  type?: string;
  category: Exclude<DisasterType, "earthquake">;
  coordinates: [number, number]; // [latitude, longitude]
  date: string | null;
  sourceUrl: string | null;
};
type NaturalResponse = { events?: NaturalEvent[]; error?: string };

type MapEvent = {
  id: string; title: string; type: DisasterType; latitude: number; longitude: number;
  details: string; date: string; sourceUrl?: string | null;
};

const SIZE = 38; // every category uses exactly the same marker dimensions
const COLORS: Record<DisasterType, string> = {
  earthquake: "#ff4058", flood: "#38bdf8", fire: "#fb923c", storm: "#22d3ee", other: "#c084fc",
};
const LABELS: Record<DisasterType, string> = {
  earthquake: "Earthquake", flood: "Flood", fire: "Wildfire", storm: "Severe storm", other: "Other event",
};

type RiskLevel = "Low" | "Moderate" | "High" | "Critical";
type RiskAssessment = { score: number; level: RiskLevel; reason: string };
const RISK_COLORS: Record<RiskLevel, string> = {
  Low: "#22c55e", Moderate: "#eab308", High: "#f97316", Critical: "#ef4444",
};

// Demo heuristic only. This is not an official warning or a validated impact forecast.
function assessEventRisk(event: MapEvent): RiskAssessment {
  let score: number;
  let reason: string;

  if (event.type === "earthquake") {
    const match = `${event.title} ${event.details}`.match(/(?:magnitude\s*|\bM\s*)([0-9]+(?:\.[0-9]+)?)/i);
    const magnitude = match ? Number(match[1]) : null;
    if (magnitude === null || !Number.isFinite(magnitude)) {
      score = 30;
      reason = "Magnitude unavailable; default estimate";
    } else {
      score = magnitude >= 7 ? 95 : magnitude >= 6 ? 82 : magnitude >= 5 ? 68 : magnitude >= 4 ? 48 : magnitude >= 3 ? 32 : 20;
      reason = `Magnitude ${magnitude.toFixed(1)}`;
    }
  } else if (event.type === "flood") {
    score = 70; reason = "Flood category baseline; local severity unavailable";
  } else if (event.type === "fire") {
    score = 65; reason = "Wildfire category baseline; fire size unavailable";
  } else if (event.type === "storm") {
    score = 60; reason = "Storm category baseline; wind/rain severity unavailable";
  } else {
    score = 35; reason = "General event baseline; severity unavailable";
  }

  const level: RiskLevel = score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 40 ? "Moderate" : "Low";
  return { score, level, reason };
}

function iconFor(type: DisasterType) {
  const color = COLORS[type];
  const symbol = {
    earthquake: `<path d="M3 17h6l3-9 5 17 4-12 3 4h5"/>`,
    flood: `<path d="M3 11c3-4 6 4 10 0s7 4 10 0 4 0 6 0M3 20c3-4 6 4 10 0s7 4 10 0 4 0 6 0"/>`,
    fire: `<path d="M17 3c1 5-4 7-2 11 1-2 4-3 4-6 5 4 7 8 4 13-3 6-12 6-15 1-3-5 0-10 4-13 0 3 1 4 2 5 2-4 1-7 3-11Z"/>`,
    storm: `<path d="M18 3 7 17h7l-1 12 12-17h-8Z"/>`,
    other: `<path d="m16 4 13 24H3Z"/><path d="M16 12v7m0 4v.5"/>`,
  }[type];
  return divIcon({
    className: "pulseai-disaster-marker",
    iconSize: [SIZE, SIZE], iconAnchor: [SIZE / 2, SIZE / 2], popupAnchor: [0, -SIZE / 2],
    html: `<div class="disaster-marker-wrap" style="--marker-color:${color};width:${SIZE}px;height:${SIZE}px">
      <span class="disaster-pulse pulse-one"></span><span class="disaster-pulse pulse-two"></span>
      <span class="disaster-marker-core"><svg viewBox="0 0 32 32" width="23" height="23" aria-hidden="true"><g fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${symbol}</g></svg></span></div>`,
  });
}
function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const container = map.getContainer();
        if (container && container.isConnected) map.invalidateSize();
      } catch (error) {
        // The map may already be unmounting during route navigation.
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [map]);
  return null;
}

// Add the base tiles after Leaflet has mounted, and remove them safely on navigation.
// This avoids React-Leaflet TileLayer cleanup racing with a route transition.
function ManagedTileLayer() {
  const map = useMap();
  useEffect(() => {
    let cancelled = false;
    let layer: L.TileLayer | null = null;
    let frame = 0;

    frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const container = map.getContainer();
        if (!container || !container.isConnected) return;
        layer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: "abc",
            maxZoom: 19,
          },
        );
        layer.addTo(map);
      } catch (error) {
        // Ignore a late tile-layer setup if the map has already been removed.
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (layer) {
        try {
          if (map.hasLayer(layer)) map.removeLayer(layer);
          layer.off();
        } catch (error) {
          // Leaflet may already have disposed of the map during navigation.
        }
      }
    };
  }, [map]);
  return null;
}

// MarkerCluster handles nearby hazards and separates them as users zoom in.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ClusteredEvents({
  events,
  icons,
}: {
  events: MapEvent[];
  icons: Map<DisasterType, ReturnType<typeof iconFor>>;
}) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      removeOutsideVisibleBounds: true,
      maxClusterRadius: 48,
      disableClusteringAtZoom: 6,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count >= 100 ? 54 : count >= 10 ? 48 : 42;
        return divIcon({
          className: "pulseai-cluster-icon",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<div class="pulseai-cluster-bubble" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
        });
      },
    });

    for (const event of events) {
      if (
        typeof event.latitude !== "number" ||
        typeof event.longitude !== "number" ||
        !Number.isFinite(event.latitude) ||
        !Number.isFinite(event.longitude) ||
        event.latitude < -90 ||
        event.latitude > 90 ||
        event.longitude < -180 ||
        event.longitude > 180
      ) {
        continue;
      }

      if (!icons.has(event.type)) icons.set(event.type, iconFor(event.type));
      const marker = L.marker([event.latitude, event.longitude], {
        icon: icons.get(event.type)!,
        title: event.title,
      });

      const title = escapeHtml(event.title || "Natural event");
      const label = escapeHtml(LABELS[event.type]);
      const details = escapeHtml(event.details || "");
      const date = escapeHtml(event.date || "Date not provided");
      const risk = assessEventRisk(event);
      const riskColor = RISK_COLORS[risk.level];
      const riskReason = escapeHtml(risk.reason);
      const sourceLink = event.sourceUrl && /^https?:\/\//i.test(event.sourceUrl)
        ? `<a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="inline-block font-medium text-sky-300 underline">View source ↗</a>`
        : "";

      marker.bindPopup(
        `<div class="min-w-[220px] space-y-2 text-sm">
          <div class="font-semibold text-white">${title}</div>
          <div class="font-medium" style="color:${COLORS[event.type]}">${label}</div>
          <div style="display:inline-flex;align-items:center;border:1px solid ${riskColor}88;border-radius:999px;padding:3px 8px;color:${riskColor};background:${riskColor}18;font-size:11px;font-weight:700">${risk.level} · ${risk.score}/100 estimated risk</div>
          <p class="text-slate-300">${details}</p>
          <p class="text-slate-400">${date}</p>
          <p class="text-slate-400" style="font-size:11px">${riskReason}. Heuristic estimate only, not an official warning.</p>
          ${sourceLink}
        </div>`,
        { className: "pulseai-event-popup" }
      );

      clusterGroup.addLayer(marker);
    }

    map.addLayer(clusterGroup);
    return () => {
      map.removeLayer(clusterGroup);
      clusterGroup.clearLayers();
    };
  }, [events, icons, map]);

  return null;
}

export default function EarthquakeMap() {
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const [mapEvents, setMapEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedWarnings, setFeedWarnings] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<Set<DisasterType>>(
    () => new Set<DisasterType>(["earthquake", "flood", "fire", "storm", "other"])
  );
  const icons = useMemo(() => new Map<DisasterType, ReturnType<typeof iconFor>>(), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const warnings: string[] = [];
      const combined: MapEvent[] = [];
      try {
        const response = await fetch("/api/earthquakes", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        for (const quake of (data.earthquakes ?? []) as Quake[]) {
          const coords = quake.geometry?.coordinates ?? [];
          if (typeof coords[0] !== "number" || typeof coords[1] !== "number") continue;
          combined.push({ id: `usgs-${quake.id}`, title: quake.properties?.place ?? quake.properties?.title ?? "Earthquake", type: "earthquake", longitude: coords[0], latitude: coords[1], details: `Magnitude ${quake.properties?.mag ?? "unknown"}${typeof coords[2] === "number" ? ` · Depth ${coords[2].toFixed(1)} km` : ""}`, date: typeof quake.properties?.time === "number" ? new Date(quake.properties.time).toLocaleString() : "Time unavailable", sourceUrl: quake.properties?.url });
        }
      } catch { warnings.push("USGS earthquake feed unavailable"); }
      try {
        const response = await fetch("/api/natural-events", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data: NaturalResponse = await response.json();
        if (data.error) warnings.push(data.error);
        for (const event of data.events ?? []) {
          // The natural-events API returns coordinates as [latitude, longitude]
          // and uses category ("flood", "fire", "storm", "other") for marker color.
          const latitude = event.coordinates?.[0];
          const longitude = event.coordinates?.[1];
          const allowedTypes: DisasterType[] = ["flood", "fire", "storm", "other"];
          const type: DisasterType = allowedTypes.includes(event.category)
            ? event.category
            : "other";

          if (
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            continue;
          }

          combined.push({
            id: `nasa-${event.id}`,
            title: event.title || "Natural event",
            type,
            latitude,
            longitude,
            details: event.type || LABELS[type],
            date: event.date ? new Date(event.date).toLocaleString() : "Date not provided",
            sourceUrl: event.sourceUrl,
          });
        }
      } catch { warnings.push("NASA natural-event feed unavailable"); }
      if (!cancelled) { setMapEvents(combined); setFeedWarnings(warnings); setLoading(false); }
    }
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const counts = (Object.keys(COLORS) as DisasterType[]).map((type) => ({ type, count: mapEvents.filter((event) => event.type === type).length }));
  const visibleEvents = mapEvents.filter((event) => activeTypes.has(event.type));
  const priorityAlerts = visibleEvents
    .map((event) => ({ event, risk: assessEventRisk(event) }))
    .filter(({ risk }) => risk.level === "Critical" || risk.level === "High")
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, 3);

  function toggleType(type: DisasterType) {
    setActiveTypes((previous) => {
      const next = new Set(previous);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function showAllTypes() {
    setActiveTypes(new Set<DisasterType>(["earthquake", "flood", "fire", "storm", "other"]));
  }

  return <div className="pulseai-map relative h-[390px] w-full overflow-hidden bg-[#061426] sm:h-[430px]">
    <style jsx global>{`
      .pulseai-map .leaflet-container{background:#061426;font-family:inherit}
      .pulseai-map .leaflet-tile-pane{filter:invert(100%) hue-rotate(180deg) brightness(82%) contrast(88%) saturate(78%)}
      .pulseai-map .leaflet-control-zoom{border:1px solid rgba(148,163,184,.28)!important;border-radius:13px!important;overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,.35)!important}
      .pulseai-map .leaflet-control-zoom a{background:rgba(7,20,38,.96)!important;color:#e2e8f0!important;border-color:rgba(148,163,184,.2)!important}
      .pulseai-map .leaflet-control-zoom a:hover{background:#12304d!important;color:#38bdf8!important}
      .pulseai-map .leaflet-control-attribution{background:rgba(3,10,20,.78)!important;color:#cbd5e1!important}.pulseai-map .leaflet-control-attribution a{color:#7dd3fc!important}
      .pulseai-disaster-marker{background:transparent;border:0}
      .pulseai-cluster-icon{background:transparent;border:0}
      .pulseai-cluster-bubble{display:flex;align-items:center;justify-content:center;box-sizing:border-box;border:2px solid #bae6fd;border-radius:9999px;background:rgba(8,31,53,.97);color:#f8fafc;font-size:13px;font-weight:800;line-height:1;box-shadow:0 0 0 4px rgba(56,189,248,.16),0 0 18px rgba(56,189,248,.38);text-shadow:0 1px 3px rgba(0,0,0,.7)}
      .pulseai-cluster-bubble span{display:block;padding:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis}
      .pulseai-map .pulseai-event-popup .leaflet-popup-content{color:#e5eefb}
      .disaster-marker-wrap{position:relative;display:flex;align-items:center;justify-content:center}
      .disaster-marker-core{position:relative;z-index:3;width:72%;height:72%;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:color-mix(in srgb,var(--marker-color) 24%,#071426);border:1px solid var(--marker-color);box-shadow:0 0 10px color-mix(in srgb,var(--marker-color) 65%,transparent),inset 0 0 10px color-mix(in srgb,var(--marker-color) 28%,transparent)}
      .disaster-marker-core svg{filter:drop-shadow(0 0 4px var(--marker-color))}.disaster-pulse{position:absolute;inset:2%;border:1.5px solid var(--marker-color);border-radius:9999px;opacity:0;animation:disaster-pulse 2.4s ease-out infinite;pointer-events:none}.pulse-two{animation-delay:1.2s}@keyframes disaster-pulse{0%{transform:scale(.65);opacity:.85}100%{transform:scale(1.5);opacity:0}}
      .pulseai-map .leaflet-popup-content-wrapper,.pulseai-map .leaflet-popup-tip{background:#0b1728;color:#e5eefb;border:1px solid rgba(100,116,139,.35);box-shadow:0 12px 32px rgba(0,0,0,.45)}.pulseai-map .leaflet-popup-content{margin:12px 14px}.pulseai-map .leaflet-popup-close-button{color:#cbd5e1!important}
      @media(prefers-reduced-motion:reduce){.disaster-pulse{animation:none;opacity:.25}}
    `}</style>
    <div className="absolute right-3 top-3 z-[500] max-w-[calc(100%-24px)]">
      <button
        type="button"
        onClick={() => setAlertsExpanded((expanded) => !expanded)}
        aria-expanded={alertsExpanded}
        className="ml-auto flex items-center gap-2 rounded-xl border border-rose-500/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
        Priority alerts ({priorityAlerts.length})
        <span className="text-slate-400">{alertsExpanded ? "−" : "+"}</span>
      </button>
      {alertsExpanded && (
        <div className="mt-2 w-[min(270px,calc(100vw-64px))] rounded-xl border border-rose-500/40 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-semibold">Highest estimated risks</span>
            <span className="rounded-full border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300">Demo estimates</span>
          </div>
          {priorityAlerts.length === 0 ? (
            <p className="text-slate-400">No high-priority events in the current filters.</p>
          ) : (
            <div className="space-y-2">
              {priorityAlerts.map(({ event, risk }) => (
                <div
                  key={event.id}
                  className="block w-full border-b border-slate-700/70 pb-2 text-left last:border-0 last:pb-0"
                >
                  <span className="block leading-snug text-slate-100">{event.title}</span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span style={{ color: COLORS[event.type] }}>{LABELS[event.type]}</span>
                    <span className="font-semibold" style={{ color: RISK_COLORS[risk.level] }}>{risk.level} · {risk.score}/100</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Rule-based demo estimates only; not official alerts or verified impact forecasts.</p>
        </div>
      )}
    </div>
    <div className="absolute right-3 bottom-14 z-[500] max-w-[calc(100%-24px)] rounded-xl border border-slate-700/70 bg-slate-950/95 px-3 py-2 text-[10px] text-slate-200 shadow-lg backdrop-blur">
      <div className="mb-1 font-semibold text-slate-100">Estimated risk · demo heuristic</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(["Low", "Moderate", "High", "Critical"] as RiskLevel[]).map((level) => {
          const count = visibleEvents.filter((event) => assessEventRisk(event).level === level).length;
          return <span key={level} className="whitespace-nowrap" style={{ color: RISK_COLORS[level] }}>● {level}: {count}</span>;
        })}
      </div>
    </div>
    <div className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/95 px-3 py-2 text-[11px] text-slate-200 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={showAllTypes}
        aria-pressed={activeTypes.size === 5}
        className={`rounded-lg border px-2 py-1 transition ${activeTypes.size === 5 ? "border-sky-400/70 bg-sky-400/15 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
      >
        All Events
      </button>
      {(Object.keys(COLORS) as DisasterType[]).map((type) => {
        const active = activeTypes.has(type);
        const count = counts.find((item) => item.type === type)?.count ?? 0;
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            aria-pressed={active}
            title={`${active ? "Hide" : "Show"} ${LABELS[type]} (${count})`}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 transition ${active ? "border-slate-600 bg-slate-800/80 text-white" : "border-slate-800 text-slate-500 opacity-70 hover:opacity-100"}`}
          >
            <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: active ? COLORS[type] : "#64748b", boxShadow: active ? `0 0 8px ${COLORS[type]}` : "none" }} />
            {LABELS[type]}
            <span className="text-[10px] opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
    <MapContainer key="pulseai-disaster-map" center={[20, 0] as LatLngExpression} zoom={2} minZoom={2} maxZoom={19} scrollWheelZoom worldCopyJump zoomControl className="h-full w-full">
      <ManagedTileLayer />
      <ResizeMap />
      <ClusteredEvents events={visibleEvents.filter((event) =>
        typeof event.latitude === "number" &&
        typeof event.longitude === "number" &&
        Number.isFinite(event.latitude) &&
        Number.isFinite(event.longitude) &&
        event.latitude >= -90 &&
        event.latitude <= 90 &&
        event.longitude >= -180 &&
        event.longitude <= 180
      )} icons={icons} />
    </MapContainer>
    <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-xl border border-slate-700/70 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur">
      <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${loading ? "bg-amber-400" : "bg-emerald-400"}`}/>{loading ? "Loading live disaster feeds…" : `${visibleEvents.length} visible / ${mapEvents.length} total events`}
      {!loading && <div className="mt-1 text-[10px] text-slate-400">USGS + NASA EONET · refreshes every 5 minutes</div>}
    </div>
    {feedWarnings.length > 0 && <div className="absolute right-3 top-3 z-[500] max-w-[250px] rounded-lg border border-amber-500/30 bg-slate-950/95 p-2 text-[11px] text-amber-200 shadow-lg">{feedWarnings.join(" · ")}</div>}
  </div>;
}
