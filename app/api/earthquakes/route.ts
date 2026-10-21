import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    );

    if (!response.ok) {
      throw new Error("Failed to fetch earthquake data");
    }

    const data = await response.json();

    return NextResponse.json({
      total: data.features.length,
      earthquakes: data.features,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch earthquake data" },
      { status: 500 }
    );
  }
}