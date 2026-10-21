import { NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

type NaturalEvent = {
  id: string;
  title: string;
  type: string;
  category: "flood" | "fire" | "storm" | "other";
  coordinates: [number, number];
  date: string | null;
  sourceUrl: string | null;
};

function coordinatesFromGeometry(geometry: AnyRecord): [number, number] | null {
  if (!geometry || geometry.coordinates == null) return null;
  const coordinates = geometry.coordinates;

  if (
    geometry.type === "Point" &&
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  ) {
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return [latitude, longitude];
    }
    return null;
  }

  const findPair = (value: any): [number, number] | null => {
    if (
      Array.isArray(value) &&
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      const longitude = value[0];
      const latitude = value[1];
      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        return [latitude, longitude];
      }
    }
    if (Array.isArray(value)) {
      for (const child of value) {
        const result = findPair(child);
        if (result) return result;
      }
    }
    return null;
  };

  return findPair(coordinates);
}

function classify(title: string, category: string): NaturalEvent["category"] {
  const text = `${title} ${category}`.toLowerCase();
  if (text.includes("flood")) return "flood";
  if (text.includes("wildfire") || text.includes("wild fire") || text.includes("fire") || text.includes("volcano")) return "fire";
  if (text.includes("storm") || text.includes("hurricane") || text.includes("cyclone") || text.includes("typhoon") || text.includes("tornado") || text.includes("severe weather")) return "storm";
  return "other";
}

function normalize(event: AnyRecord): NaturalEvent | null {
  const title = String(event.title ?? event.name ?? "Natural event");
  const categoryList = Array.isArray(event.categories) ? event.categories : [];
  const type = categoryList
    .map((item: AnyRecord) => String(item?.title ?? item?.id ?? ""))
    .filter(Boolean)
    .join(", ") || "Natural event";

  const geometryList = Array.isArray(event.geometry)
    ? event.geometry
    : Array.isArray(event.geometries)
      ? event.geometries
      : event.geometry
        ? [event.geometry]
        : [];

  let coordinates: [number, number] | null = null;
  let date: string | null = null;
  for (const geometry of [...geometryList].reverse()) {
    const result = coordinatesFromGeometry(geometry);
    if (result) {
      coordinates = result;
      date = geometry?.date ?? null;
      break;
    }
  }
  if (!coordinates) return null;

  return {
    id: String(event.id ?? event.link ?? title),
    title,
    type,
    category: classify(title, type),
    coordinates,
    date,
    sourceUrl: event.link ?? event.sources?.[0]?.url ?? null,
  };
}

async function getJson(url: string, timeoutMs: number): Promise<AnyRecord> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PulseAI-Disaster-Intelligence/1.0",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NASA EONET returned HTTP ${response.status}`);
  }

  // Some network filters/proxies can return RSS/XML for API requests.
  // Parse JSON by content type first, with a guarded JSON parse fallback.
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (contentType.includes("json") || text.trimStart().startsWith("{")) {
    try {
      return JSON.parse(text) as AnyRecord;
    } catch {
      throw new Error("NASA EONET returned invalid JSON");
    }
  }

  throw new Error(
    `NASA EONET returned ${contentType || "an unknown content type"} instead of JSON. The browser API URL works, but the server request may be intercepted by a network filter or proxy.`
  );
}

const ENDPOINTS = [
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300",
  "https://eonet.gsfc.nasa.gov/api/v2.1/events?status=open&limit=300",
];

let cachedResponse: {
  events: NaturalEvent[];
  updatedAt: string;
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 60_000;

export async function GET() {
  if (cachedResponse && cachedResponse.expiresAt > Date.now()) {
    return NextResponse.json({
      total: cachedResponse.events.length,
      events: cachedResponse.events,
      source: "NASA EONET",
      updatedAt: cachedResponse.updatedAt,
      cached: true,
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  const errors: string[] = [];

  for (const url of ENDPOINTS) {
    try {
      const payload = await getJson(url, 8000);
      if (!Array.isArray(payload.events)) {
        throw new Error("NASA EONET JSON response did not contain an events array");
      }

      const events = (payload.events as AnyRecord[])
        .filter((event) => event && typeof event === "object")
        .map(normalize)
        .filter((event): event is NaturalEvent => event !== null);

      const updatedAt = new Date().toISOString();
      cachedResponse = {
        events,
        updatedAt,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };

      return NextResponse.json({
        total: events.length,
        events,
        source: "NASA EONET",
        updatedAt,
        cached: false,
      }, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown NASA API error");
    }
  }

  if (cachedResponse) {
    return NextResponse.json({
      total: cachedResponse.events.length,
      events: cachedResponse.events,
      source: "NASA EONET",
      updatedAt: cachedResponse.updatedAt,
      cached: true,
      stale: true,
      warning: "NASA EONET is temporarily unavailable; showing the last successfully retrieved feed.",
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  return NextResponse.json({
    total: 0,
    events: [],
    source: "NASA EONET",
    error: `NASA natural-event feed is temporarily unavailable. ${errors.join(" | ")}`,
    updatedAt: new Date().toISOString(),
  }, {
    status: 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
