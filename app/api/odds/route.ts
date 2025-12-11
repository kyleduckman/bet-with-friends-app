import { NextRequest, NextResponse } from "next/server";

type Outcome = { name: string; price: number };

type Game = {
  id: string;
  sport: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  outcomes: Outcome[];
};

// ---- Simple in-memory cache (per server instance) ----

type CacheEntry = {
  timestamp: number;
  data: { games: Game[] };
};

const cache = new Map<string, CacheEntry>();

// How long to keep odds in cache (ms)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCache(key: string): { games: Game[] } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const isStale = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isStale) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: { games: Game[] }) {
  cache.set(key, { timestamp: Date.now(), data });
}

// ------------------------------------------------------

export async function GET(req: NextRequest) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ODDS_API_KEY env var" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const sportKey =
    searchParams.get("sport") ?? "basketball_nba"; // default if none passed

  const cacheKey = `odds:${sportKey}`;

  // ---- 1. Try cache first ----
  const cached = getCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  try {
    // Adjust this URL/params if your current odds route uses something slightly different.
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Odds API error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch odds from provider" },
        { status: 500 }
      );
    }

    const raw = await res.json();

    // Map provider data → Game[]
    // The Odds API returns an array where each item is a game with bookmakers & markets.
    const games: Game[] = (raw || []).map((g: any) => {
      const sport_key = g.sport_key ?? sportKey;
      const commence_time = g.commence_time;

      const homeTeam = g.home_team;
      const awayTeam = g.away_team;

      // Find the first bookmaker + market "h2h" (moneyline)
      const bookmaker = (g.bookmakers || [])[0];
      const market = bookmaker?.markets?.find(
        (m: any) => m.key === "h2h"
      );

      const outcomes: Outcome[] =
        market?.outcomes?.map((o: any) => ({
          name: o.name,
          price: o.price, // american odds
        })) ?? [];

      return {
        id: g.id,
        sport: sport_key,
        commenceTime: commence_time,
        homeTeam,
        awayTeam,
        outcomes,
      };
    });

    const payload = { games };

    // ---- 2. Save to cache before returning ----
    setCache(cacheKey, payload);

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("Unexpected odds route error:", err);
    return NextResponse.json(
      { error: "Unexpected error fetching odds" },
      { status: 500 }
    );
  }
}
