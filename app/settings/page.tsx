"use client";

import { useEffect, useState } from "react";
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
  Settings as SettingsIcon,
  ShieldAlert,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Info,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Live Map", href: "/?view=map", icon: Map },
  { name: "Earthquakes", href: "/earthquakes", icon: Mountain },
  { name: "Weather", href: "/weather", icon: CloudSun },
  { name: "Natural Events", href: "/natural-events", icon: Activity },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

type Preferences = {
  appearance: "dark" | "light";
  notifications: boolean;
  sound: boolean;
  refreshInterval: "1" | "5" | "10" | "15";
  aiResponseStyle: "concise" | "balanced" | "detailed";
};

const DEFAULTS: Preferences = {
  appearance: "dark",
  notifications: true,
  sound: false,
  refreshInterval: "5",
  aiResponseStyle: "balanced",
};

const STORAGE_KEY = "pulseai-settings-v1";

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Preferences>;
        setPreferences({ ...DEFAULTS, ...parsed });
      }
    } catch (error) {
      console.error("Could not load PulseAI settings:", error);
    } finally {
      setMounted(true);
    }
  }, []);

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setSaved(true);
    } catch (error) {
      console.error("Could not save PulseAI settings:", error);
      setSaved(false);
    }
  }

  function resetSettings() {
    setPreferences(DEFAULTS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
      setSaved(true);
    } catch (error) {
      console.error("Could not reset PulseAI settings:", error);
      setSaved(false);
    }
  }

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
            const active = item.name === "Settings";
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

        <div className="m-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
            <SettingsIcon size={16} />
            Preferences
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Settings are stored in this browser on this device.
          </p>
        </div>
      </aside>

      <main className="ml-64 min-h-screen">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              PulseAI Workspace
            </p>
            <h2 className="mt-2 text-2xl font-bold">Settings</h2>
            <p className="mt-1 text-sm text-slate-400">
              Customize your PulseAI dashboard experience.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {mounted ? "Preferences loaded" : "Loading preferences"}
          </div>
        </header>

        <section className="mx-auto max-w-5xl space-y-6 p-8">
          <div className="rounded-2xl border border-white/10 bg-[#0d1524] p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                {preferences.appearance === "dark" ? <Moon size={22} /> : <Sun size={22} />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Appearance</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Choose the appearance used by the dashboard.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <OptionButton
                    active={preferences.appearance === "dark"}
                    onClick={() => update("appearance", "dark")}
                    icon={<Moon size={18} />}
                    title="Dark mode"
                    description="Dark interface, suited to monitoring dashboards."
                  />
                  <OptionButton
                    active={preferences.appearance === "light"}
                    onClick={() => update("appearance", "light")}
                    icon={<Sun size={18} />}
                    title="Light mode"
                    description="Use a light theme on the dashboard."
                  />
                </div>
                {preferences.appearance === "light" && (
                  <p className="mt-3 text-xs text-amber-300">
                    The dashboard applies this preference. Other pages may still use their own theme until they are integrated.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1524] p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                {preferences.notifications ? <Bell size={22} /> : <VolumeX size={22} />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Control in-app notification preferences.
                </p>
                <Toggle
                  checked={preferences.notifications}
                  onChange={(value) => update("notifications", value)}
                  title="Enable notification preference"
                  description="Show or hide the dashboard's in-app hazard notification panel."
                />
                <div className="mt-4">
                  <Toggle
                    checked={preferences.sound}
                    onChange={(value) => update("sound", value)}
                    title="Sound preference"
                    description="Play a short tone when newly detected hazards are added on the dashboard."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1524] p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                <RefreshCw size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Data refresh</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Choose how often the dashboard refreshes its USGS and NASA EONET feeds.
                </p>
                <label className="mt-4 block max-w-sm text-sm text-slate-300">
                  Refresh interval
                  <select
                    value={preferences.refreshInterval}
                    onChange={(event) =>
                      update("refreshInterval", event.target.value as Preferences["refreshInterval"])
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#111b2b] px-3 py-3 outline-none focus:border-cyan-400/50"
                  >
                    <option value="1">Every 1 minute</option>
                    <option value="5">Every 5 minutes</option>
                    <option value="10">Every 10 minutes</option>
                    <option value="15">Every 15 minutes</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1524] p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                <Sparkles size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">AI Assistant</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Choose your preferred response length. The AI Assistant API still needs to be connected to this preference.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <OptionButton
                    active={preferences.aiResponseStyle === "concise"}
                    onClick={() => update("aiResponseStyle", "concise")}
                    title="Concise"
                    description="Short, direct answers."
                  />
                  <OptionButton
                    active={preferences.aiResponseStyle === "balanced"}
                    onClick={() => update("aiResponseStyle", "balanced")}
                    title="Balanced"
                    description="Useful detail without being too long."
                  />
                  <OptionButton
                    active={preferences.aiResponseStyle === "detailed"}
                    onClick={() => update("aiResponseStyle", "detailed")}
                    title="Detailed"
                    description="More context and explanation."
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Saved locally. This setting will affect generated answers after the AI Assistant API is updated to read it.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1524] p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                <Info size={22} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">About PulseAI</h3>
                <p className="mt-1 text-sm text-slate-400">
                  AI-powered disaster intelligence interface.
                </p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <InfoRow label="Application" value="PulseAI" />
                  <InfoRow label="Version" value="1.0.0" />
                  <InfoRow label="Data sources" value="USGS Earthquake API · NASA EONET" />
                  <InfoRow label="Preferences storage" value="This browser (localStorage)" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d1524] p-5">
            <div className="flex items-center gap-2 text-sm">
              {saved ? (
                <span className="inline-flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 size={17} />
                  Settings saved
                </span>
              ) : (
                <span className="text-slate-400">Remember to save your changes.</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetSettings}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5"
              >
                <RotateCcw size={16} />
                Reset
              </button>
              <button
                onClick={saveSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-400"
              >
                <Save size={16} />
                Save settings
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-cyan-400/50 bg-cyan-400/10"
          : "border-white/10 bg-black/10 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2 font-medium">
        {icon && <span className="text-cyan-300">{icon}</span>}
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-cyan-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200">{value}</p>
    </div>
  );
}
