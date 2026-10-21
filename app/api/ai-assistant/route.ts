import { NextResponse } from "next/server";

type RequestBody = {
  message?: unknown;
  responseStyle?: "concise" | "balanced" | "detailed";
};

type Earthquake = {
  properties?: { mag?: number | null; place?: string; time?: number; title?: string; url?: string };
};

type NaturalEvent = {
  title?: string;
  category?: string;
  type?: string;
  date?: string;
  details?: string;
  sourceUrl?: string;
};

const SYSTEM_PROMPT = `You are PulseAI, a practical disaster preparedness and safety assistant.
Answer the user's actual question directly. Do not start with generic introductions such as "Hello, I am PulseAI".
For safety questions, provide clear numbered steps and useful immediate actions. For flood safety, explain moving to higher ground, avoiding floodwater and walking/driving through it, following official evacuation instructions, switching off electricity only if safe, and keeping emergency supplies/phone ready. Never suggest entering floodwater or touching wet electrical equipment.
Use live-feed context only when relevant. Clearly distinguish live feed data from general safety advice. Never invent event locations, magnitudes, counts, timestamps, or official warnings. If a feed is unavailable, say so plainly but still answer general safety questions.
For immediate danger, tell the user to contact local emergency services and follow official local-authority instructions. Keep answers calm, complete, practical, and concise.`;

async function fetchFeed(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function getEarthquakes(payload: unknown): Earthquake[] {
  if (Array.isArray(payload)) return payload as Earthquake[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { earthquakes?: unknown }).earthquakes)) {
    return (payload as { earthquakes: Earthquake[] }).earthquakes;
  }
  return [];
}

function getNaturalEvents(payload: unknown): NaturalEvent[] {
  if (Array.isArray(payload)) return payload as NaturalEvent[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { events?: unknown }).events)) {
    return (payload as { events: NaturalEvent[] }).events;
  }
  return [];
}

function formatEarthquakes(payload: unknown | null) {
  if (payload === null) {
    return "I couldn't retrieve the live earthquake feed right now. Please try again shortly and follow local authorities for urgent safety information.";
  }
  const items = getEarthquakes(payload)
    .sort((a, b) => (b.properties?.time ?? 0) - (a.properties?.time ?? 0))
    .slice(0, 5);
  if (!items.length) return "The earthquake API responded but returned no earthquake records, so I can't list current events.";

  const lines = items.map((item, i) => {
    const p = item.properties ?? {};
    const magnitude = p.mag == null ? "Magnitude unavailable" : `Magnitude ${Number(p.mag).toFixed(1)}`;
    const location = p.place || p.title || "Location unavailable";
    const time = p.time
      ? new Date(p.time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "Time unavailable";
    return `${i + 1}. ${magnitude} — ${location}\n   Time (India): ${time}${p.url ? `\n   Source: ${p.url}` : ""}`;
  });
  return `Here are up to five of the latest earthquakes returned by PulseAI's connected USGS feed:\n\n${lines.join("\n\n")}\n\nThis is feed data, not an official emergency alert, and may not include every earthquake.`;
}

function formatNaturalEvents(payload: unknown | null) {
  if (payload === null) {
    return "I couldn't retrieve the connected natural-event feed right now. Please try again shortly. This feed is not a complete hazard list or an official emergency-warning service.";
  }
  const items = getNaturalEvents(payload)
    .slice()
    .sort((a, b) => Date.parse(b.date || "") - Date.parse(a.date || ""))
    .slice(0, 8);
  if (!items.length) return "The natural-event API responded but returned no event records, so I can't list current events.";

  const lines = items.map((event, i) => {
    const title = event.title || "Untitled natural event";
    const category = event.category || event.type || "Category unavailable";
    const parsedDate = event.date ? new Date(event.date) : null;
    const date = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
      : "Date unavailable";
    return `${i + 1}. ${title}\n   Category: ${category}\n   Date (India): ${date}${event.details ? `\n   Details: ${event.details}` : ""}${event.sourceUrl ? `\n   Source: ${event.sourceUrl}` : ""}`;
  });
  return `Natural events returned by PulseAI's connected NASA EONET feed (sorted by event date where available):\n\n${lines.join("\n\n")}\n\nThis feed is not a complete hazard list or an official emergency alert.`;
}

function isRetryable(status: number) {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

async function callGemini(model: string, apiKey: string, prompt: string, maxOutputTokens: number) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens },
      }),
      signal: AbortSignal.timeout(14000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      const reply = result?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .trim();
      if (reply) return { reply };
      return { status: 502, error: "Gemini returned an empty answer. The response may have been cut off." };
    }
    return { status: response.status, error: result?.error?.message || `Gemini API request failed (${response.status}).` };
  } catch (error) {
    return {
      status: 504,
      error: error instanceof Error && error.name === "TimeoutError"
        ? "The model request timed out."
        : "Could not connect to Gemini. Check your network connection.",
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    if (message.length > 4000) {
      return NextResponse.json({ error: "Your question is too long. Please keep it under 4000 characters." }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const question = message.toLowerCase();
    const listingIntent = /\b(list|show|display|latest|recent|current events|feed|data|reports|reported events|what events|which events)\b/.test(question);
    const asksEarthquakes = /\b(earthquake|earthquakes|seismic)\b/.test(question) && listingIntent;
    const asksNaturalEvents =
      /\b(natural events?|wildfires?|wild fires?|storms?|cyclones?|volcan(?:o|ic)|disasters?)\b/.test(question) &&
      listingIntent;

    if (asksEarthquakes || asksNaturalEvents) {
      const isEarthquake = asksEarthquakes;
      const payload = await fetchFeed(`${origin}${isEarthquake ? "/api/earthquakes" : "/api/natural-events"}`);
      return NextResponse.json({
        reply: isEarthquake ? formatEarthquakes(payload) : formatNaturalEvents(payload),
        liveData: isEarthquake
          ? { earthquakes: payload === null ? "unavailable" : "available" }
          : { naturalEvents: payload === null ? "unavailable" : "available" },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: "Gemini is not configured. Add GEMINI_API_KEY to frontend/.env.local and restart the development server.",
      }, { status: 500 });
    }

    // Keep the model the user previously used as primary. Avoid retired fallback models.
    const preferredModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
    const configuredFallback = process.env.GEMINI_FALLBACK_MODEL?.trim();
    const fallbackModel = configuredFallback || "gemini-3.8-flash";
    const responseStyle = body.responseStyle ?? "balanced";
    const styleInstruction = responseStyle === "concise"
      ? "Answer briefly but completely, with the most important actions first."
      : responseStyle === "detailed"
        ? "Give a detailed, organized answer with practical steps, precautions, and brief explanations."
        : "Give a balanced, complete answer with clear numbered steps when useful.";

    const [earthquakePayload, naturalPayload] = await Promise.all([
      fetchFeed(`${origin}/api/earthquakes`),
      fetchFeed(`${origin}/api/natural-events`),
    ]);

    const liveContext = {
      contextTimestamp: new Date().toISOString(),
      earthquakes: earthquakePayload === null
        ? "Feed unavailable"
        : getEarthquakes(earthquakePayload).slice(0, 5).map((item) => ({
            magnitude: item.properties?.mag ?? null,
            location: item.properties?.place ?? item.properties?.title ?? "Location unavailable",
            time: item.properties?.time ? new Date(item.properties.time).toISOString() : null,
          })),
      naturalEvents: naturalPayload === null
        ? "Feed unavailable"
        : getNaturalEvents(naturalPayload).slice(0, 5).map((item) => ({
            title: item.title ?? "Untitled natural event",
            category: item.category ?? item.type ?? "Uncategorized",
            date: item.date ?? null,
          })),
    };

    const prompt = `${SYSTEM_PROMPT}

Response style: ${styleInstruction}

Rules:
- Answer the user's question directly and completely.
- Do not merely greet the user or repeat their question.
- If the user requests five steps, provide five distinct numbered steps.
- Give actionable general safety advice even when live feeds are unavailable.
- Only refer to live data below when relevant; it does not determine the user's local risk.
- Use plain language and avoid markdown tables.

Connected live-feed context (JSON; may be incomplete):
${JSON.stringify(liveContext)}

User question:
${message}`;

    const maxOutputTokens = responseStyle === "detailed" ? 1200 : responseStyle === "concise" ? 450 : 850;
    let result = await callGemini(preferredModel, apiKey, prompt, maxOutputTokens);

    if (!result.reply && result.status && isRetryable(result.status)) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      result = await callGemini(preferredModel, apiKey, prompt, maxOutputTokens);
    }

    let usedFallback = false;
    if (!result.reply && result.status && isRetryable(result.status) && fallbackModel !== preferredModel) {
      result = await callGemini(fallbackModel, apiKey, prompt, maxOutputTokens);
      usedFallback = Boolean(result.reply);
    }

    if (result.reply) {
      return NextResponse.json({
        reply: result.reply,
        model: usedFallback ? fallbackModel : preferredModel,
        usedFallback,
        liveData: {
          earthquakes: earthquakePayload === null ? "unavailable" : "available",
          naturalEvents: naturalPayload === null ? "unavailable" : "available",
        },
      });
    }

    const status = result.status ?? 502;
    const error = status === 429
      ? "Gemini is receiving too many requests right now. Please wait and try again."
      : status === 503 || status === 502 || status >= 500
        ? `Gemini is temporarily unavailable on the preferred model${fallbackModel !== preferredModel ? " and fallback model" : ""}. Live earthquake and natural-event feed questions can still work. Details: ${result.error || "temporary service error"}`
        : result.error || "Gemini could not answer this request.";
    return NextResponse.json({ error }, { status: status >= 400 && status <= 599 ? status : 502 });
  } catch {
    return NextResponse.json({ error: "The AI request could not be processed. Please try again." }, { status: 500 });
  }
}
