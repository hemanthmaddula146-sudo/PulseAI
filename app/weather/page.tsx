"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, Bell, Brain, Cloud, CloudDrizzle, CloudRain,
  CloudSnow, FileText, Flame, Globe, Home, Map, MapPin, Menu, Moon,
  Search, Settings, Shield, Sun, Thermometer, Wind, Waves, Zap, RefreshCw, LocateFixed
} from "lucide-react";

type Place = { name: string; country?: string; admin1?: string; latitude: number; longitude: number; timezone?: string };
type CurrentWeather = {
  temperature_2m?: number; relative_humidity_2m?: number; apparent_temperature?: number;
  is_day?: number; precipitation?: number; rain?: number; showers?: number;
  weather_code?: number; wind_speed_10m?: number; wind_gusts_10m?: number;
};
type DailyWeather = {
  time: string[]; weather_code?: number[]; temperature_2m_max?: number[];
  temperature_2m_min?: number[]; precipitation_probability_max?: number[];
  wind_speed_10m_max?: number[];
};
type Forecast = { current?: CurrentWeather; daily?: DailyWeather; timezone?: string };

const navigation = [
  { name: "Dashboard", icon: Home, path: "/" },
  { name: "Live Map", icon: Map, path: "/", view: "Live Map" },
  { name: "Earthquakes", icon: Activity, path: "/earthquakes" },
  { name: "Weather", icon: Cloud, path: "/weather" },
  { name: "Natural Events", icon: Flame, path: "/", view: "Natural Events" },
  { name: "Alerts", icon: Bell, path: "/alerts" },
  { name: "AI Assistant", icon: Brain, path: "/", view: "AI Assistant" },
  { name: "Reports", icon: FileText, path: "/", view: "Reports" },
  { name: "Settings", icon: Settings, path: "/", view: "Settings" },
];

function weatherDescription(code?: number) {
  if (code === undefined) return "Weather unavailable";
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Mainly clear / partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain showers";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Variable conditions";
}
function WeatherIcon({ code, size = 34 }: { code?: number; size?: number }) {
  if (code === undefined || code === 0 || code === 1) return <Sun size={size} />;
  if ([51,53,55,56,57].includes(code)) return <CloudDrizzle size={size} />;
  if ([61,63,65,66,67,80,81,82].includes(code)) return <CloudRain size={size} />;
  if ([71,73,75,77,85,86].includes(code)) return <CloudSnow size={size} />;
  if ([95,96,99].includes(code)) return <CloudDrizzle size={size} />;
  return <Cloud size={size} />;
}

export default function WeatherPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [locationInput, setLocationInput] = useState("Rajamahendravaram");
  const [place, setPlace] = useState<Place>({ name: "Rajamahendravaram", country: "India", latitude: 17.0005, longitude: 81.804 });
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadForecast = useCallback(async (selectedPlace: Place) => {
    setLoading(true); setError("");
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({
        latitude: String(selectedPlace.latitude), longitude: String(selectedPlace.longitude),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,wind_speed_10m,wind_gusts_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
        timezone: "auto", forecast_days: "7"
      }).toString();
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error("Weather service returned an error.");
      const data = await response.json();
      setForecast(data); setUpdatedAt(new Date());
    } catch {
      setError("Could not load weather data. Check your internet connection and try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadForecast(place); }, [place, loadForecast]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location detection. Please search for a city below.");
      return;
    }

    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Try to get a readable place name for the detected coordinates.
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?${new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), language: "en", format: "json" })}`
          );
          const data = response.ok ? await response.json() : null;
          const result = data?.results?.[0];
          const detectedPlace: Place = {
            name: result?.name || "My location",
            country: result?.country,
            admin1: result?.admin1,
            latitude,
            longitude,
            timezone: result?.timezone,
          };
          setPlace(detectedPlace);
          setLocationInput(detectedPlace.name);
        } catch {
          // GPS coordinates are enough to load weather even if reverse lookup fails.
          setPlace({ name: "My location", latitude, longitude });
          setLocationInput("My location");
        } finally {
          setLocating(false);
        }
      },
      (geoError) => {
        setLocating(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError("Location permission was denied. Allow location access in your browser, or search for a city below.");
        } else if (geoError.code === geoError.TIMEOUT) {
          setError("We couldn't detect your location in time. Please try again or search for a city below.");
        } else {
          setError("Unable to detect your location. Please try again or search for a city below.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
    );
  };

  const searchLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = locationInput.trim();
    if (!query) return;
    setSearching(true); setError("");
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: "1", language: "en", format: "json" })}`);
      if (!response.ok) throw new Error("Location search failed.");
      const data = await response.json();
      const result = data.results?.[0];
      if (!result) { setError(`No location found for “${query}”. Try a city name.`); return; }
      setPlace({ name: result.name, country: result.country, admin1: result.admin1, latitude: result.latitude, longitude: result.longitude, timezone: result.timezone });
    } catch { setError("Location search failed. Please check your internet connection."); }
    finally { setSearching(false); }
  };

  const current = forecast?.current;
  const daily = forecast?.daily;
  const pageBg = darkMode ? "bg-[#070d18] text-slate-100" : "bg-slate-100 text-slate-900";
  const cardBg = darkMode ? "bg-[#0e1726] border-slate-800" : "bg-white border-slate-200";
  const muted = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <main className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      <header className={`sticky top-0 z-20 flex h-[78px] items-center justify-between gap-4 border-b px-5 md:px-8 ${darkMode ? "border-slate-800 bg-[#090f1b]" : "border-slate-200 bg-white"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-2 hover:bg-slate-500/10" aria-label="Toggle sidebar"><Menu size={21} /></button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><Activity size={29} /></div>
          <div><h1 className="text-2xl font-bold tracking-tight">Pulse<span className="text-cyan-400">AI</span></h1><p className={`hidden text-xs sm:block ${muted}`}>Real-Time Disaster Intelligence</p></div>
        </div>
        <div className="hidden items-center gap-2 md:flex"><Globe size={17} className={muted}/><span className={`text-sm ${muted}`}>Weather Intelligence</span></div>
        <div className="flex items-center gap-3">
          <button onClick={() => void loadForecast(place)} className={`rounded-xl border p-2.5 ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`} title="Refresh weather" aria-label="Refresh weather"><RefreshCw size={18} className={loading ? "animate-spin text-cyan-400" : "text-cyan-400"}/></button>
          <button onClick={() => setDarkMode(!darkMode)} className={`rounded-xl border p-2.5 ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`} aria-label="Toggle theme">{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <div className={`hidden h-9 w-9 items-center justify-center rounded-full sm:flex ${darkMode ? "bg-slate-800 text-cyan-300" : "bg-slate-200 text-slate-700"}`}><Shield size={18}/></div>
        </div>
      </header>
      <div className="flex">
        {sidebarOpen && <aside className={`min-h-[calc(100vh-78px)] w-60 shrink-0 border-r p-4 ${darkMode ? "border-slate-800 bg-[#09111e]" : "border-slate-200 bg-white"}`}>
          <p className={`mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] ${muted}`}>Workspace</p>
          <nav className="space-y-1">{navigation.map((item) => { const Icon = item.icon; const active = item.name === "Weather"; return <button key={item.name} onClick={() => { if (item.view) { router.push(`/?view=${encodeURIComponent(item.view)}`); } else if (item.path !== "/") { router.push(item.path); } else { router.push("/"); } }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active ? "bg-cyan-500/15 font-semibold text-cyan-400" : `${muted} hover:bg-slate-500/10 hover:text-cyan-400`}`}><Icon size={18}/>{item.name}{item.name === "Alerts" && <span className="ml-auto rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-400">!</span>}</button>; })}</nav>
          <div className={`mt-10 rounded-2xl border p-4 ${darkMode ? "border-cyan-900/60 bg-cyan-950/20" : "border-cyan-200 bg-cyan-50"}`}><div className="mb-3 flex items-center gap-2 text-cyan-500"><Zap size={18}/><span className="text-sm font-semibold">PulseAI Weather</span></div><p className={`text-xs leading-5 ${muted}`}>Live conditions and a 7-day forecast from Open-Meteo.</p><p className={`mt-3 text-[10px] ${muted}`}>Informational data, not an official warning service.</p></div>
        </aside>}
        <section className="min-w-0 flex-1 p-4 md:p-6 lg:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300"><Cloud size={14}/> WEATHER INTELLIGENCE</div><h2 className="text-3xl font-bold">Weather Overview</h2><p className={`mt-2 text-sm ${muted}`}>Current conditions and a seven-day outlook for your selected location.</p></div><div className={`text-xs ${muted}`}>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Waiting for weather data"}</div></div>
          <div className={`mb-3 rounded-2xl border p-4 ${cardBg}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">Use your current location</h3>
                <p className={`mt-1 text-sm ${muted}`}>Allow your browser to access your location to show local weather.</p>
              </div>
              <button type="button" onClick={useMyLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60">
                <LocateFixed size={18} />{locating ? "Detecting location…" : "Use my location"}
              </button>
            </div>
          </div>
          <div className={`mb-6 px-1 text-xs ${muted}`}>Or search for a city below</div>
          <form onSubmit={searchLocation} className={`mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row ${cardBg}`}><div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-500/20 px-4 py-3"><Search size={18} className="text-cyan-400"/><input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="Search a city, e.g. Hyderabad" className="w-full bg-transparent text-sm outline-none" aria-label="Search location"/></div><button type="submit" disabled={searching} className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60">{searching ? "Searching…" : "Search location"}</button></form>
          {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300"><AlertTriangle size={19} className="mt-0.5 shrink-0"/><p>{error}</p></div>}
          {loading && !forecast ? <div className={`rounded-2xl border p-12 text-center ${cardBg}`}><RefreshCw className="mx-auto mb-3 animate-spin text-cyan-400" size={28}/><p className={muted}>Loading current weather…</p></div> : <>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_1fr]">
              <div className="relative overflow-hidden rounded-2xl border border-cyan-900/40 bg-gradient-to-br from-[#0c2343] via-[#102c52] to-[#071522] p-6 md:p-8"><div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl"/><div className="relative flex flex-wrap items-start justify-between gap-5"><div><p className="flex items-center gap-2 text-sm text-cyan-200"><MapPin size={16}/>{place.name}{place.admin1 ? `, ${place.admin1}` : ""}{place.country ? `, ${place.country}` : ""}</p><p className="mt-5 text-6xl font-bold tracking-tight">{current?.temperature_2m != null ? `${Math.round(current.temperature_2m)}°` : "—"}<span className="text-2xl text-cyan-200">C</span></p><p className="mt-3 text-lg text-slate-200">{weatherDescription(current?.weather_code)}</p><p className="mt-1 text-sm text-slate-400">Feels like {current?.apparent_temperature != null ? `${Math.round(current.apparent_temperature)}°C` : "—"}</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-cyan-200"><WeatherIcon code={current?.weather_code} size={58}/></div></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl border border-white/10 bg-white/5 p-3"><Thermometer size={17} className="text-cyan-200"/><p className="mt-3 text-xs text-slate-400">Humidity</p><p className="mt-1 text-lg font-semibold">{current?.relative_humidity_2m ?? "—"}%</p></div><div className="rounded-xl border border-white/10 bg-white/5 p-3"><Wind size={17} className="text-cyan-200"/><p className="mt-3 text-xs text-slate-400">Wind</p><p className="mt-1 text-lg font-semibold">{current?.wind_speed_10m ?? "—"} <span className="text-xs">km/h</span></p></div><div className="rounded-xl border border-white/10 bg-white/5 p-3"><Waves size={17} className="text-cyan-200"/><p className="mt-3 text-xs text-slate-400">Precipitation</p><p className="mt-1 text-lg font-semibold">{current?.precipitation ?? "—"} <span className="text-xs">mm</span></p></div><div className="rounded-xl border border-white/10 bg-white/5 p-3"><Wind size={17} className="text-cyan-200"/><p className="mt-3 text-xs text-slate-400">Wind gusts</p><p className="mt-1 text-lg font-semibold">{current?.wind_gusts_10m ?? "—"} <span className="text-xs">km/h</span></p></div></div></div>
              <div className={`rounded-2xl border p-5 md:p-6 ${cardBg}`}><h3 className="text-lg font-bold">Weather status</h3><p className={`mt-1 text-sm ${muted}`}>Current conditions at the selected location</p><div className="mt-5 space-y-4">{[{label:"Rain right now",value: current?.rain != null ? `${current.rain} mm` : "—"},{label:"Showers",value: current?.showers != null ? `${current.showers} mm` : "—"},{label:"Maximum wind gust",value: current?.wind_gusts_10m != null ? `${current.wind_gusts_10m} km/h` : "—"},{label:"Daylight",value: current?.is_day == null ? "—" : current.is_day ? "Daytime" : "Nighttime"}].map((item) => <div key={item.label} className="flex items-center justify-between gap-3 border-b border-slate-500/10 pb-3 last:border-0"><span className={`text-sm ${muted}`}>{item.label}</span><span className="text-sm font-semibold">{item.value}</span></div>)}</div><div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"><p className="text-sm font-semibold text-cyan-300">Weather data source</p><p className={`mt-1 text-xs leading-5 ${muted}`}>Open-Meteo forecast API. Conditions are informational and may differ from local official alerts.</p></div></div>
            </div>
            <div className={`mt-6 rounded-2xl border p-5 md:p-6 ${cardBg}`}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">7-day forecast</h3><p className={`mt-1 text-sm ${muted}`}>Daily conditions, high and low temperatures, and precipitation chance.</p></div><span className={`text-xs ${muted}`}>{forecast?.timezone || place.timezone || "Local time zone"}</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{(daily?.time || []).map((date, index) => <div key={date} className={`rounded-xl border p-4 ${darkMode ? "border-slate-700/70 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}><p className="text-sm font-semibold">{index === 0 ? "Today" : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</p><p className={`mt-1 text-xs ${muted}`}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p><div className="my-4 text-cyan-300"><WeatherIcon code={daily?.weather_code?.[index]} size={30}/></div><p className="text-xs leading-5">{weatherDescription(daily?.weather_code?.[index])}</p><div className="mt-3 flex items-center gap-2"><span className="font-bold">{daily?.temperature_2m_max?.[index] != null ? `${Math.round(daily.temperature_2m_max[index]!)}°` : "—"}</span><span className={muted}>{daily?.temperature_2m_min?.[index] != null ? `${Math.round(daily.temperature_2m_min[index]!)}°` : "—"}</span></div><p className={`mt-3 text-xs ${muted}`}>Rain chance: {daily?.precipitation_probability_max?.[index] ?? "—"}%</p><p className={`mt-1 text-xs ${muted}`}>Wind: {daily?.wind_speed_10m_max?.[index] ?? "—"} km/h</p></div>)}</div></div>
          </>}
          <footer className={`mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-500/10 py-5 text-xs ${muted}`}><p>PulseAI · Weather Intelligence</p><p>Source: Open-Meteo · Not an official emergency warning service</p></footer>
        </section>
      </div>
    </main>
  );
}
