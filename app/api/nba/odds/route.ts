import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ODDS_API_KEY not configured" },
      { status: 500 }
    );
  }

  const url =
    "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/\
?regions=us&markets=h2h&oddsFormat=american&bookmakers=draftkings";

  const res = await fetch(`${url}&apiKey=${apiKey}`, {
    // avoid Next caching so you see fresh-ish odds
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Odds API error:", res.status, text);
    return NextResponse.json(
      { error: "Failed to fetch odds" },
      { status: 500 }
    );
  }

  const data = await res.json();

  // Simplify shape for the frontend
  const games = (data || []).map((event: any) => {
    const dk = event.bookmakers?.[0];
    const h2h = dk?.markets?.[0];
    return {
      id: event.id,
      commenceTime: event.commence_time,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      outcomes: h2h?.outcomes?.map((o: any) => ({
        name: o.name,           // team name
        price: o.price,         // american odds, e.g. -120
      })) || [],
    };
  });

  return NextResponse.json({ games });
}
