// Server-side proxy for the iTunes Search API.
//
// Why this exists: as of late 2026, Apple redirects browser-origin requests
// to `itunes.apple.com/search` → `musics://mzstoreservices-...apple.com/...`,
// their custom scheme that opens the native Music app. Browsers can't follow
// that redirect (`ERR_UNKNOWN_URL_SCHEME`), so the frontend hitting iTunes
// directly — whether via fetch, XHR, or JSONP — all fail.
//
// Node's `fetch` on the server doesn't look like a browser (no browser UA,
// no Origin header), so Apple serves the raw JSON. Frontend calls this
// endpoint same-origin, side-stepping the whole issue.

import { NextResponse } from "next/server";

export const runtime = "edge";
// Short cache: identical queries within 60s share a result, keeping the
// outbound rate to Apple low even under rapid typing.
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = (searchParams.get("term") || "").trim();
  const limit = searchParams.get("limit") || "15";
  const country = searchParams.get("country") || "us";

  if (!term) {
    return NextResponse.json({ results: [] });
  }

  const upstream = new URL("https://itunes.apple.com/search");
  upstream.searchParams.set("term", term);
  upstream.searchParams.set("media", "music");
  upstream.searchParams.set("entity", "song");
  upstream.searchParams.set("limit", limit);
  upstream.searchParams.set("country", country);

  try {
    const res = await fetch(upstream.toString(), {
      // No browser-ish headers → Apple doesn't try to redirect us.
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `iTunes returned ${res.status}`, results: [] },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { results?: unknown[] };
    return NextResponse.json(
      { results: data.results ?? [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "upstream fetch failed",
        results: [],
      },
      { status: 502 }
    );
  }
}
