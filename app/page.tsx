"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const EarthquakeMap = dynamic(
  () => import("./components/EarthquakeMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[390px] items-center justify-center rounded-b-2xl bg-[#08192b] text-sm text-cyan-400">
        Loading global earthquake map...
      </div>
    ),
  },
);
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronRight,
  Cloud,
  Flame,
  FileText,
  Globe,
  Home,
  Map,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  Waves,
  Zap,
  Brain,
  Maximize2,
  X,
  CheckCheck,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", icon: Home },
  { name: "Live Map", icon: Map },
  { name: "Earthquakes", icon: Activity },
  { name: "Weather", icon: Cloud },
  { name: "Natural Events", icon: Flame },
  { name: "Alerts", icon: Bell },
  { name: "AI Assistant", icon: Brain },
  { name: "Reports", icon: FileText },
  { name: "Settings", icon: Settings },
];

type Earthquake = {
  id: string;
  properties: {
    mag: number | null;
    place: string;
    time: number;
    url: string;
    title: string;
  };
  geometry: {
    coordinates: number[];
  };
};

type NaturalEvent = {
  id?: string;
  title?: string;
  type?: string;
  category?: string;
  details?: string;
  date?: string;
  sourceUrl?: string;
};

type HazardNotification = {
  id: string;
  title: string;
  detail: string;
  category: string;
  detectedAt: number;
  url?: string;
  read: boolean;
};

type PulseAIPreferences = {
  appearance: "dark" | "light";
  notifications: boolean;
  sound: boolean;
  refreshInterval: "1" | "5" | "10" | "15";
  aiResponseStyle: "concise" | "balanced" | "detailed";
};

const SETTINGS_STORAGE_KEY = "pulseai-settings-v1";
const DEFAULT_PREFERENCES: PulseAIPreferences = {
  appearance: "dark",
  notifications: true,
  sound: false,
  refreshInterval: "5",
  aiResponseStyle: "balanced",
};

export default function HomePage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<PulseAIPreferences["refreshInterval"]>("5");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [earthquakeLoading, setEarthquakeLoading] = useState(true);
  const [earthquakeError, setEarthquakeError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [naturalEvents, setNaturalEvents] = useState<NaturalEvent[]>([]);
  const [naturalEventsLoading, setNaturalEventsLoading] = useState(true);
  const [naturalEventsError, setNaturalEventsError] = useState("");
  const [notifications, setNotifications] = useState<HazardNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const previousHazardIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PulseAIPreferences>;
        const preferences = { ...DEFAULT_PREFERENCES, ...parsed };
        setDarkMode(preferences.appearance !== "light");
        setRefreshInterval(preferences.refreshInterval);
        setNotificationsEnabled(preferences.notifications);
        setSoundEnabled(preferences.sound);
      }
    } catch (error) {
      console.error("Could not load PulseAI preferences:", error);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  function playHazardNotificationSound() {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      const context = new AudioContextConstructor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.23);
      oscillator.onended = () => void context.close();
    } catch (error) {
      console.warn("PulseAI notification sound could not play:", error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const loadDashboardFeeds = async () => {
      const [earthquakeResult, naturalResult] = await Promise.allSettled([
        fetch("/api/earthquakes", { cache: "no-store" }),
        fetch("/api/natural-events", { cache: "no-store" }),
      ]);

      if (earthquakeResult.status === "fulfilled") {
        try {
          const response = earthquakeResult.value;
          if (!response.ok) throw new Error("Earthquake feed unavailable");
          const data: { total?: number; earthquakes?: Earthquake[] } = await response.json();
          if (isMounted) {
            setEarthquakes(Array.isArray(data.earthquakes) ? data.earthquakes : []);
            setEarthquakeError("");
            setLastUpdated(Date.now());
          }
        } catch {
          if (isMounted) setEarthquakeError("Could not load live earthquake data.");
        }
      } else if (isMounted) {
        setEarthquakeError("Could not load live earthquake data.");
      }

      if (naturalResult.status === "fulfilled") {
        try {
          const response = naturalResult.value;
          if (!response.ok) throw new Error("Natural-event feed unavailable");
          const data = await response.json();
          const items = Array.isArray(data) ? data : Array.isArray(data.events) ? data.events : [];
          if (isMounted) {
            setNaturalEvents(items);
            setNaturalEventsError("");
          }
        } catch {
          if (isMounted) setNaturalEventsError("Natural-event feed unavailable.");
        }
      } else if (isMounted) {
        setNaturalEventsError("Natural-event feed unavailable.");
      }

      if (isMounted) {
        setEarthquakeLoading(false);
        setNaturalEventsLoading(false);
      }
    };

    void loadDashboardFeeds();
    const interval = window.setInterval(
      () => void loadDashboardFeeds(),
      Number(refreshInterval) * 60 * 1000,
    );
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [refreshInterval]);

  // Establish a baseline on the first successful load, then notify only for newly appearing IDs.
  useEffect(() => {
    if (earthquakeLoading || naturalEventsLoading) return;

    const currentHazards: HazardNotification[] = [
      ...earthquakes.map((quake) => ({
        id: `usgs-${quake.id}`,
        title: quake.properties.title || "New earthquake detected",
        detail: `Magnitude ${quake.properties.mag ?? "unknown"} · ${quake.properties.place || "Location unavailable"}`,
        category: "Earthquake",
        detectedAt: quake.properties.time || Date.now(),
        url: quake.properties.url,
        read: false,
      })),
      ...naturalEvents.map((event, index) => {
        const category = getNaturalEventCategory(event);
        const categoryLabel =
          category === "fire" ? "Wildfire" :
          category === "storm" ? "Severe weather" :
          category === "flood" ? "Flood" : "Natural event";
        return {
          id: `nasa-${event.id || `${event.title || "event"}-${index}`}`,
          title: event.title || `${categoryLabel} reported`,
          detail: event.details || event.type || event.category || "NASA EONET natural event",
          category: categoryLabel,
          detectedAt: event.date ? new Date(event.date).getTime() || Date.now() : Date.now(),
          url: event.sourceUrl,
          read: false,
        };
      }),
    ];

    const currentIds = new Set(currentHazards.map((hazard) => hazard.id));
    if (previousHazardIds.current === null) {
      previousHazardIds.current = currentIds;
      return;
    }

    const newHazards = currentHazards.filter(
      (hazard) => !previousHazardIds.current!.has(hazard.id),
    );
    if (newHazards.length > 0 && notificationsEnabled) {
      playHazardNotificationSound();
      setNotifications((existing) => {
        const knownNotificationIds = new Set(existing.map((item) => item.id));
        const additions = newHazards
          .filter((item) => !knownNotificationIds.has(item.id))
          .map((item) => ({ ...item, read: false }));
        return [...additions, ...existing].slice(0, 50);
      });
    }
    previousHazardIds.current = currentIds;
  }, [earthquakes, naturalEvents, earthquakeLoading, naturalEventsLoading, notificationsEnabled]);

  const unreadNotificationCount = notifications.filter((item) => !item.read).length;

  const liveEvents = earthquakes.slice(0, 8).map((quake) => ({
    id: quake.id,
    title: quake.properties.title || "Earthquake reported",
    detail: `Magnitude ${quake.properties.mag ?? "unknown"} · ${quake.properties.place || "Location unavailable"}`,
    time: new Date(quake.properties.time).toLocaleString(),
    type: "Earthquake",
    color: "red",
    url: quake.properties.url,
  }));

  const pageBg = darkMode
    ? "bg-[#070d18] text-slate-100"
    : "bg-slate-100 text-slate-900";

  const cardBg = darkMode
    ? "bg-[#0e1726] border-slate-800"
    : "bg-white border-slate-200";

  const muted = darkMode ? "text-slate-400" : "text-slate-500";

  const filteredEvents = liveEvents.filter((event) =>
    `${event.title} ${event.detail} ${event.type}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const getNaturalEventCategory = (event: NaturalEvent): "fire" | "storm" | "flood" | "other" => {
    const text = `${event.category ?? ""} ${event.type ?? ""} ${event.title ?? ""}`.toLowerCase();
    if (/wild.?fire|wildfires|fire|volcano|volcanic/.test(text)) return "fire";
    if (/storm|hurricane|cyclone|typhoon|severe weather|tornado/.test(text)) return "storm";
    if (/flood|inundation/.test(text)) return "flood";
    return "other";
  };

  const wildfireCount = naturalEvents.filter((event) => getNaturalEventCategory(event) === "fire").length;
  const severeWeatherCount = naturalEvents.filter((event) => getNaturalEventCategory(event) === "storm").length;

  const statistics = [
    { title: "Earthquakes (24h)", value: earthquakeLoading ? "…" : earthquakeError ? "—" : String(earthquakes.length), icon: Activity, color: "red", source: earthquakeError ? "Feed unavailable" : "USGS live feed" },
    { title: "Wildfires", value: naturalEventsLoading ? "…" : naturalEventsError ? "—" : String(wildfireCount), icon: Flame, color: "orange", source: naturalEventsError ? "Feed unavailable" : "NASA EONET feed" },
    { title: "Severe Weather", value: naturalEventsLoading ? "…" : naturalEventsError ? "—" : String(severeWeatherCount), icon: Cloud, color: "blue", source: naturalEventsError ? "Feed unavailable" : "NASA EONET feed" },
    { title: "Overall Hazards", value: earthquakeLoading || naturalEventsLoading ? "…" : earthquakeError && naturalEventsError ? "—" : String((earthquakeError ? 0 : earthquakes.length) + (naturalEventsError ? 0 : naturalEvents.length)), icon: AlertTriangle, color: "purple", source: earthquakeError && naturalEventsError ? "Feeds unavailable" : "USGS + NASA EONET" },
  ];

  return (
    <main className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      {/* TOP NAVIGATION */}
      <header
        className={`sticky top-0 z-20 flex h-[78px] items-center justify-between gap-4 border-b px-5 md:px-8 ${
          darkMode
            ? "border-slate-800 bg-[#090f1b]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 hover:bg-slate-500/10"
            aria-label="Toggle sidebar"
          >
            <Menu size={21} />
          </button>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Activity size={29} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Pulse<span className="text-cyan-400">AI</span>
            </h1>
            <p className={`hidden text-xs sm:block ${muted}`}>
              Real-Time Disaster Intelligence
            </p>
          </div>
        </div>

        <div
          className={`hidden max-w-xl flex-1 items-center gap-3 rounded-xl border px-4 py-3 md:flex ${
            darkMode
              ? "border-slate-700 bg-slate-900"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <Search size={18} className={muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full bg-transparent text-sm outline-none"
          />
          <span className={`text-xs ${muted}`}>⌕</span>
        </div>

        <div className="relative flex shrink-0 items-center gap-3">
          {notificationsEnabled && <button
            onClick={() => setNotificationsOpen((open) => !open)}
            className={`relative rounded-xl border p-2.5 transition ${
              darkMode
                ? "border-slate-700 bg-slate-900 text-cyan-300 hover:border-cyan-500/50"
                : "border-slate-200 bg-white text-slate-700 hover:border-cyan-500/50"
            }`}
            aria-label={`Open notifications (${unreadNotificationCount} unread)`}
            title="Hazard notifications"
          >
            <Bell size={19} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </span>
            )}
          </button>}

          <button
            onClick={() => {
              const nextDarkMode = !darkMode;
              setDarkMode(nextDarkMode);
              try {
                const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
                const preferences = {
                  ...DEFAULT_PREFERENCES,
                  ...(stored ? JSON.parse(stored) as Partial<PulseAIPreferences> : {}),
                  appearance: nextDarkMode ? "dark" : "light",
                };
                window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences));
              } catch (error) {
                console.error("Could not save appearance preference:", error);
              }
            }}
            className={`flex items-center gap-2 rounded-full border p-2 ${
              darkMode
                ? "border-slate-700 bg-slate-900"
                : "border-slate-200 bg-slate-100"
            }`}
            aria-label="Toggle dark and light mode"
            title="Toggle theme"
          >
            <Sun
              size={18}
              className={darkMode ? "text-slate-500" : "text-orange-500"}
            />
            <span
              className={`h-6 w-6 rounded-full transition-all ${
                darkMode
                  ? "bg-cyan-500 shadow-lg shadow-cyan-500/20"
                  : "bg-white shadow"
              }`}
            />
            <Moon
              size={18}
              className={darkMode ? "text-cyan-300" : "text-slate-400"}
            />
          </button>

          <div
            className={`hidden h-9 w-9 items-center justify-center rounded-full sm:flex ${
              darkMode
                ? "bg-slate-800 text-cyan-300"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            <Shield size={18} />
          </div>

          {notificationsOpen && (
            <div className={`absolute right-0 top-14 z-[1000] w-[min(92vw,390px)] overflow-hidden rounded-2xl border shadow-2xl ${
              darkMode ? "border-slate-700 bg-[#0b1422] text-slate-100" : "border-slate-200 bg-white text-slate-900"
            }`}>
              <div className="flex items-center justify-between border-b border-slate-500/20 p-4">
                <div>
                  <h3 className="font-semibold">Hazard notifications</h3>
                  <p className={`mt-1 text-xs ${muted}`}>{unreadNotificationCount} unread · New events detected during refresh</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setNotifications((items) => items.map((item) => ({ ...item, read: true })))}
                    className={`rounded-lg p-2 ${muted} hover:bg-slate-500/10`}
                    title="Mark all as read"
                    aria-label="Mark all notifications as read"
                  >
                    <CheckCheck size={17} />
                  </button>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className={`rounded-lg p-2 ${muted} hover:bg-slate-500/10`}
                    title="Close notifications"
                    aria-label="Close notifications"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className={`mx-auto mb-2 ${muted}`} size={22} />
                    <p className="text-sm font-medium">No new hazards detected</p>
                    <p className={`mt-1 text-xs ${muted}`}>PulseAI checks the connected feeds every {refreshInterval} minute{refreshInterval === "1" ? "" : "s"}.</p>
                  </div>
                ) : notifications.map((item) => (
                  <div key={item.id} className={`mb-1 rounded-xl p-3 ${item.read ? "opacity-70" : darkMode ? "bg-cyan-500/5" : "bg-cyan-50"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-slate-500" : "bg-cyan-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold">{item.category}</span>
                          {!item.read && <span className="text-[10px] font-semibold text-cyan-400">NEW</span>}
                        </div>
                        <p className="mt-1 text-sm font-medium">{item.title}</p>
                        <p className={`mt-1 text-xs ${muted}`}>{item.detail}</p>
                        <p className={`mt-1 text-[10px] ${muted}`}>{Number.isFinite(item.detectedAt) ? new Date(item.detectedAt).toLocaleString() : "Time unavailable"}</p>
                        <div className="mt-2 flex gap-3">
                          <button
                            onClick={() => setNotifications((items) => items.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry))}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            Mark read
                          </button>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300">
                              Open source ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`border-t border-slate-500/20 px-4 py-3 text-[10px] ${muted}`}>
                Feed-based notifications only; not official emergency warnings.
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside
            className={`hidden min-h-[calc(100vh-78px)] w-60 shrink-0 border-r p-4 lg:block ${
              darkMode
                ? "border-slate-800 bg-[#09111e]"
                : "border-slate-200 bg-white"
            }`}
          >
            <p
              className={`mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] ${muted}`}
            >
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.name === "Alerts") {
                        router.push("/alerts");
                      } else if (item.name === "Earthquakes") {
                        router.push("/earthquakes");
                      } else if (item.name === "Weather") {
                        router.push("/weather");
                      } else if (item.name === "Natural Events") {
                        router.push("/natural-events");
                      } else if (item.name === "Reports") {
                        router.push("/reports");
                      } else if (item.name === "Settings") {
                        router.push("/settings");
                      } else if (item.name === "AI Assistant") {
                        router.push("/ai-assistant");
                      } else {
                        setActivePage(item.name);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                      active
                        ? "bg-cyan-500/15 font-semibold text-cyan-400"
                        : `${muted} hover:bg-slate-500/10 hover:text-cyan-400`
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                    {item.name === "Alerts" && (
                      <span className="ml-auto rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                        3
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div
              className={`mt-10 rounded-2xl border p-4 ${
                darkMode
                  ? "border-cyan-900/60 bg-cyan-950/20"
                  : "border-cyan-200 bg-cyan-50"
              }`}
            >
              <div className="mb-3 flex items-center gap-2 text-cyan-500">
                <Zap size={18} />
                <span className="text-sm font-semibold">PulseAI Engine</span>
              </div>
              <p className={`text-xs leading-5 ${muted}`}>
                AI-powered event intelligence will be connected in the next
                development stage.
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-500/20">
                <div className="h-full w-2/3 rounded-full bg-cyan-500" />
              </div>
              <p className={`mt-2 text-[10px] ${muted}`}>
                Interface preview
              </p>
            </div>
          </aside>
        )}

        {/* MAIN CONTENT */}
        <section className="min-w-0 flex-1 p-4 md:p-6 lg:p-7">
          {activePage === "Live Map" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Live Disaster Map</h2>
                  <p className={`mt-1 text-sm ${muted}`}>
                    Explore earthquake and natural-event reports from connected live feeds.
                  </p>
                </div>
                <div className={`rounded-xl border px-3 py-2 text-xs ${cardBg} ${muted}`}>
                  Refreshes automatically every {refreshInterval} minute{refreshInterval === "1" ? "" : "s"}
                </div>
              </div>

              <div className={`overflow-hidden rounded-2xl border ${cardBg}`}>
                <EarthquakeMap />
                <div className={`border-t border-slate-500/10 p-4 text-xs ${muted}`}>
                  {earthquakeError && naturalEventsError
                    ? "Both live feeds are currently unavailable. The map may show no events until a feed reconnects."
                    : earthquakeError
                      ? "NASA EONET may be available, but the USGS earthquake feed is currently unavailable."
                      : naturalEventsError
                        ? "USGS earthquake data is available, but the NASA natural-event feed is currently unavailable."
                        : "Connected feeds: USGS earthquakes and NASA EONET natural events."}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className={`rounded-2xl border p-5 ${cardBg}`}>
                  <p className={`text-sm ${muted}`}>Earthquakes</p>
                  <p className="mt-2 text-3xl font-bold">{earthquakeLoading ? "…" : earthquakeError ? "—" : earthquakes.length}</p>
                  <p className={`mt-1 text-xs ${muted}`}>USGS live feed</p>
                </div>
                <div className={`rounded-2xl border p-5 ${cardBg}`}>
                  <p className={`text-sm ${muted}`}>Wildfires</p>
                  <p className="mt-2 text-3xl font-bold">{naturalEventsLoading ? "…" : naturalEventsError ? "—" : wildfireCount}</p>
                  <p className={`mt-1 text-xs ${muted}`}>NASA EONET feed</p>
                </div>
                <div className={`rounded-2xl border p-5 ${cardBg}`}>
                  <p className={`text-sm ${muted}`}>Overall hazards</p>
                  <p className="mt-2 text-3xl font-bold">
                    {earthquakeLoading || naturalEventsLoading
                      ? "…"
                      : earthquakeError && naturalEventsError
                        ? "—"
                        : (earthquakeError ? 0 : earthquakes.length) + (naturalEventsError ? 0 : naturalEvents.length)}
                  </p>
                  <p className={`mt-1 text-xs ${muted}`}>Combined reported events</p>
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* HERO BANNER */}
          <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden rounded-2xl border border-cyan-900/40 bg-gradient-to-r from-[#0c2343] via-[#102c52] to-[#071522] p-6 text-center md:min-h-[275px] md:p-9">
            <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-12 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
              <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300">
                <Globe size={14} />
                GLOBAL INTELLIGENCE PLATFORM
              </div>

              <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
                Global Disasters.
                <span className="block text-cyan-400">
                  Clearer Insights.
                </span>
              </h2>

              <p className="mt-4 text-sm text-slate-300 md:text-lg">
                Real-time data. AI-powered analysis. A safer tomorrow.
              </p>

              <p className="mt-4 text-xs text-slate-400 md:text-sm">
                Live USGS earthquakes · NASA EONET natural events
              </p>
            </div>
          </div>

          {/* PAGE TITLE */}
          <div className="mb-5 mt-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{activePage}</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                Overview of disaster intelligence
              </p>
            </div>

            <div className={`text-xs ${muted}`}>
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-400" />
              {!settingsLoaded ? "Loading preferences" : earthquakeError ? "Data connection issue" : lastUpdated ? `USGS updated ${new Date(lastUpdated).toLocaleTimeString()}` : "Connecting to live data"}
            </div>
          </div>

          {/* STATISTICS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.map((stat) => {
              const Icon = stat.icon;

              const colors: Record<string, string> = {
                red: "bg-red-500/10 text-red-400 border-red-500/20",
                orange:
                  "bg-orange-500/10 text-orange-400 border-orange-500/20",
                blue: "bg-sky-500/10 text-sky-400 border-sky-500/20",
                purple:
                  "bg-purple-500/10 text-purple-400 border-purple-500/20",
              };

              return (
                <div
                  key={stat.title}
                  className={`rounded-2xl border p-5 ${cardBg}`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${colors[stat.color]}`}
                    >
                      <Icon size={22} />
                    </div>
                    <span className={`text-xs ${muted}`}>{stat.source}</span>
                  </div>

                  <p className={`mt-5 text-sm ${muted}`}>{stat.title}</p>

                  <div className="mt-1 flex items-end justify-between">
                    <span className="text-3xl font-bold">{stat.value}</span>
                    <span className={`text-xs ${muted}`}>
                      {stat.source.includes("unavailable") ? "Unavailable" : stat.value === "…" ? "Loading" : stat.title === "Overall Hazards" ? "Combined total" : "Live count"}
                    </span>
                  </div>

                  <div className="mt-4 flex h-8 items-end gap-1">
                    {[25, 40, 32, 55, 45, 75, 62, 95].map((height, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${colors[stat.color].split(" ")[0]}`}
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* MAP + EVENTS */}
          <div className="mt-6 grid grid-cols-1 gap-5 2xl:grid-cols-[1.65fr_1fr]">
            {/* MAP PREVIEW */}
            <div className={`overflow-hidden rounded-2xl border ${cardBg}`}>
              <div className="flex items-center justify-between border-b border-slate-500/10 p-5">
                <div>
                  <h3 className="font-bold">Global Event Map</h3>
                  <p className={`mt-1 text-xs ${muted}`}>
                    Geographic event overview
                  </p>
                </div>
                <button
                  onClick={() => setActivePage("Live Map")}
                  className="rounded-lg p-2 text-cyan-400 hover:bg-cyan-500/10"
                  aria-label="Open live map"
                >
                  <Maximize2 size={18} />
                </button>
              </div>

              <EarthquakeMap />

              <div className={`border-t border-slate-500/10 p-4 text-xs ${muted}`}>
                {earthquakeError && naturalEventsError
                  ? "USGS and NASA EONET feeds unavailable"
                  : earthquakeError
                    ? "NASA EONET connected · USGS feed unavailable"
                    : naturalEventsError
                      ? "Connected to USGS · NASA EONET feed unavailable"
                      : lastUpdated
                        ? `USGS + NASA EONET feeds · Refresh every ${refreshInterval} minute${refreshInterval === "1" ? "" : "s"}`
                        : "Connecting to disaster feeds…"}
              </div>
            </div>

            {/* RECENT EVENTS */}
            <div className="space-y-5">
              <div className={`rounded-2xl border ${cardBg}`}>
                <div className="flex items-center justify-between border-b border-slate-500/10 p-5">
                  <div>
                    <h3 className="font-bold">Recent Events</h3>
                    <p className={`mt-1 text-xs ${muted}`}>
                      {earthquakeError ? "Live feed unavailable" : "Latest events from USGS"}
                    </p>
                  </div>
                  <button
                    onClick={() => setActivePage("Natural Events")}
                    className="flex items-center gap-1 text-xs text-cyan-400"
                  >
                    View all <ChevronRight size={15} />
                  </button>
                </div>

                <div className="p-3">
                  {earthquakeLoading && (
                    <p className={`p-6 text-center text-sm ${muted}`}>Loading live earthquake events…</p>
                  )}
                  {!earthquakeLoading && earthquakeError && (
                    <p className="p-6 text-center text-sm text-amber-400">{earthquakeError} Please try again shortly.</p>
                  )}
                  {!earthquakeLoading && !earthquakeError && filteredEvents.map((event) => {
                    const Icon = Activity;

                    return (
                      <a
                        key={event.id}
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-500/5"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            event.color === "red"
                              ? "bg-red-500/10 text-red-400"
                              : event.color === "orange"
                                ? "bg-orange-500/10 text-orange-400"
                                : event.color === "blue"
                                  ? "bg-sky-500/10 text-sky-400"
                                  : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          <Icon size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {event.title}
                          </p>
                          <p className={`mt-1 text-xs ${muted}`}>
                            {event.detail}
                          </p>
                          <p className={`mt-1 text-[10px] ${muted}`}>
                            {event.time}
                          </p>
                        </div>

                        <ChevronRight size={17} className={muted} />
                      </a>
                    );
                  })}

                  {!earthquakeLoading && !earthquakeError && filteredEvents.length === 0 && (
                    <p className={`p-6 text-center text-sm ${muted}`}>
                      {search ? "No earthquakes match your search." : "No earthquake events were returned by the feed."}
                    </p>
                  )}
                </div>
              </div>

              {/* AI INSIGHTS */}
              <div
                className={`rounded-2xl border p-5 ${cardBg}`}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Brain size={20} className="text-purple-400" />
                  <h3 className="font-bold">AI Insights</h3>
                  <span className="ml-auto rounded-md bg-purple-500/10 px-2 py-1 text-[10px] text-purple-400">
                    PREVIEW
                  </span>
                </div>

                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                  <p className="text-sm leading-6">
                    {earthquakeError
                      ? "Live earthquake information is temporarily unavailable."
                      : `PulseAI is receiving ${earthquakes.length} earthquake records from the USGS past-day feed. AI-generated analysis will be added after the Nebius model integration.`}
                  </p>
                  <p className={`mt-3 text-xs ${muted}`}>
                    Source: USGS earthquake feed. This panel is informational only; Nebius AI analysis is not connected yet.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/ai-assistant")}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-500/20 py-3 text-sm font-medium transition hover:border-purple-400/50 hover:text-purple-400"
                >
                  <Brain size={17} />
                  Open AI Assistant
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <footer
            className={`mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-500/10 py-5 text-xs ${muted}`}
          >
            <p>PulseAI · Real-Time Disaster Intelligence</p>
            <p>USGS + NASA EONET · Counts reflect events returned by each feed</p>
          </footer>
            </>
          )}
        </section>
      </div>
    </main>
  );
}