"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  UserRound,
  Send,
  LoaderCircle,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  LayoutDashboard,
  Map,
  Mountain,
  CloudSun,
  Activity,
  Bell,
  FileText,
  Settings,
  Shield,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

type ApiResponse = {
  reply?: string;
  error?: string;
  model?: string;
  usedFallback?: boolean;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeLinkUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Render plain-text model output as readable paragraphs, lists, headings, and safe links. */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<{ type: "heading" | "paragraph" | "list" | "blank"; text: string; ordered?: boolean; index?: number }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      blocks.push({ type: "blank", text: "" });
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", text: heading[1].replace(/\*\*/g, "") });
      continue;
    }

    const ordered = line.match(/^(?:\*\*)?(\d{1,2})[.)](?:\*\*)?\s+(.+)$/);
    if (ordered) {
      blocks.push({ type: "list", text: ordered[2].replace(/\*\*/g, ""), ordered: true, index: Number(ordered[1]) });
      continue;
    }

    const unordered = line.match(/^(?:[-*•])\s+(.+)$/);
    if (unordered) {
      blocks.push({ type: "list", text: unordered[1].replace(/\*\*/g, ""), ordered: false });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  const renderInline = (text: string) => {
    const parts = text.split(/(https?:\/\/[^\s<>()]+|\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, index) => {
      if (part.startsWith("http://") || part.startsWith("https://")) {
        const clean = part.replace(/[.,;!?]+$/, "");
        const url = safeLinkUrl(clean);
        return url ? (
          <a
            key={`${index}-${part}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-cyan-400 underline decoration-cyan-400/40 underline-offset-4 hover:text-cyan-300"
          >
            {clean} <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
          </a>
        ) : part;
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${index}-${part}`} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-2.5 text-sm leading-7 text-slate-200">
      {blocks.map((block, index) => {
        if (block.type === "blank") return <div key={`blank-${index}`} className="h-1" />;
        if (block.type === "heading") {
          return <h3 key={`heading-${index}`} className="pt-1 text-sm font-semibold text-white">{renderInline(block.text)}</h3>;
        }
        if (block.type === "list") {
          return (
            <div key={`list-${index}`} className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-semibold text-cyan-300">
                {block.ordered ? `${block.index}.` : "•"}
              </span>
              <div className="min-w-0 flex-1">{renderInline(block.text)}</div>
            </div>
          );
        }
        return <p key={`paragraph-${index}`} className="whitespace-pre-wrap">{renderInline(block.text)}</p>;
      })}
    </div>
  );
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [responseStyle, setResponseStyle] = useState<"concise" | "balanced" | "detailed">("balanced");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pulseai-settings-v1");
      if (stored) {
        const settings = JSON.parse(stored);
        if (["concise", "balanced", "detailed"].includes(settings.aiResponseStyle)) {
          setResponseStyle(settings.aiResponseStyle);
        }
      }
    } catch {
      // Ignore invalid local preferences.
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const suggestions = useMemo(() => [
    "What should I do during a flood emergency?",
    "Show me the latest earthquake data.",
    "List the latest natural events.",
    "What belongs in an emergency kit?",
  ], []);

  const sendMessage = useCallback(async (override?: string) => {
    const question = (override ?? input).trim();
    if (!question || loading) return;

    const userMessage: Message = { id: makeId(), role: "user", content: question };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, responseStyle }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || "PulseAI couldn't answer right now. Please try again.");
      }

      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: payload.reply as string },
      ]);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: message, error: true },
      ]);
    } finally {
      setLoading(false);
      requestRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, loading, responseStyle]);

  const copyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  };

  const clearChat = () => {
    requestRef.current?.abort();
    setMessages([]);
    setLoading(false);
  };

  const navigation = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Live Map", href: "/live-map", icon: Map },
    { label: "Earthquakes", href: "/earthquakes", icon: Mountain },
    { label: "Weather", href: "/weather", icon: CloudSun },
    { label: "Natural Events", href: "/natural-events", icon: Activity },
    { label: "Alerts", href: "/alerts", icon: Bell },
    { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
    { label: "Reports", href: "/reports", icon: FileText },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-[#050914] text-slate-100">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-white/[0.07] bg-[#080e1b]/95 shadow-[12px_0_40px_rgba(0,0,0,0.12)] backdrop-blur-xl xl:w-64">
        <div className="flex h-[92px] items-center gap-3 border-b border-white/[0.07] px-6">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 text-cyan-200 shadow-lg shadow-cyan-950/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight text-white">Pulse<span className="text-cyan-300">AI</span></div>
            <div className="text-xs text-slate-400">Disaster Intelligence</div>
          </div>
        </div>
        <div className="px-5 pt-7 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Workspace</div>
        <nav className="mt-3 flex-1 space-y-1.5 px-3" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/ai-assistant";
            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  active
                    ? "border border-cyan-300/10 bg-gradient-to-r from-cyan-400/15 to-blue-500/10 font-semibold text-cyan-200 shadow-sm shadow-cyan-950/30"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="m-4 rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.08] to-cyan-400/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            AI Safety Assistant
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">General disaster preparedness and safety guidance.</p>
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-3 sm:p-5 lg:p-6">
      <main className="mx-auto flex h-[calc(100vh-3rem)] min-h-[560px] w-full max-w-[1600px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950/70 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:px-7">
        <div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" /><h1 className="text-lg font-bold tracking-tight text-white">AI Assistant</h1></div>
          <p className="mt-1 text-sm text-slate-400">Your intelligent disaster preparedness companion</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="pulseai-response-style">Response detail</label>
          <select
            id="pulseai-response-style"
            value={responseStyle}
            onChange={(event) => setResponseStyle(event.target.value as "concise" | "balanced" | "detailed")}
            className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2.5 text-xs font-medium text-slate-200 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
          >
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
          </select>
          <button
            type="button"
            onClick={clearChat}
            disabled={messages.length === 0 && !loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title="Clear conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 text-xs font-medium text-emerald-300 sm:flex">
            <Sparkles className="h-3.5 w-3.5" />
            Gemini-powered assistant
          </div>
        </div>
      </header>

      <section ref={scrollRef} className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.035),transparent_55%)] px-4 py-5 sm:px-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center py-8 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/15 via-blue-400/10 to-indigo-400/10 text-cyan-200 shadow-xl shadow-cyan-950/30 ring-1 ring-white/[0.04]">
              <Bot className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">How can I help you stay safe?</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
              Ask about disaster preparedness or explore the connected earthquake and natural-event feeds.
            </p>
            <div className="mt-7 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  disabled={loading}
                  className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-4 text-left text-sm leading-6 text-slate-300 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-400/[0.05] hover:text-white hover:shadow-lg hover:shadow-cyan-950/20 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-5">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${message.error ? "bg-amber-500/10 text-amber-300" : "bg-cyan-500/10 text-cyan-300"}`}>
                    {message.error ? <AlertTriangle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                )}
                <article className={`group relative max-w-[88%] rounded-2xl border px-4 py-3 sm:max-w-[82%] ${
                  message.role === "user"
                    ? "border-cyan-400/20 bg-cyan-500 text-white"
                    : message.error
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-slate-800 bg-slate-900/80"
                }`}>
                  {message.error && <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> Unable to complete request</p>}
                  <FormattedMessage content={message.content} />
                  {message.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => void copyMessage(message)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 opacity-70 transition hover:bg-slate-800 hover:text-white"
                      aria-label="Copy assistant response"
                    >
                      {copiedId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === message.id ? "Copied" : "Copy"}
                    </button>
                  )}
                </article>
                {message.role === "user" && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                    <UserRound className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3" role="status" aria-label="PulseAI is preparing a response">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                  <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                  PulseAI is preparing a response…
                  <span className="flex gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="border-t border-white/[0.07] bg-[#080d18]/90 px-4 py-4 sm:px-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
          className="mx-auto max-w-4xl"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2 shadow-lg shadow-black/10 transition focus-within:border-cyan-300/50 focus-within:ring-2 focus-within:ring-cyan-400/[0.08]">
            <label className="sr-only" htmlFor="pulseai-message">Ask PulseAI</label>
            <textarea
              ref={inputRef}
              id="pulseai-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask about disaster preparedness..."
              rows={1}
              maxLength={4000}
              disabled={loading}
              className="max-h-36 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md shadow-cyan-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
              title="Send message"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            AI responses may be inaccurate. Follow official emergency instructions during disasters.
          </p>
        </form>
      </footer>
      </main>
      </div>
    </div>
  );
}
