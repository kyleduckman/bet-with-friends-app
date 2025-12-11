import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ODDS_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  // default to NBA if none provided
  const sport = searchParams.get("sport") || "basketball_nba";

  const baseUrl =
    `https://api.the-odds-api.com/v4/sports/${sport}/odds/` +
    `?regions=us&markets=h2h&oddsFormat=american&bookmakers=draftkings`;

  const res = await fetch(`${baseUrl}&apiKey=${apiKey}`, {
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

  const games = (data || []).map((event: any) => {
    const bookmaker = event.bookmakers?.[0];
    const h2h = bookmaker?.markets?.[0];

    return {
      id: event.id,
      sport,
      commenceTime: event.commence_time,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      outcomes:
        h2h?.outcomes?.map((o: any) => ({
          name: o.name,
          price: o.price, // american odds
        })) ?? [],
    };
  });

  return NextResponse.json({ games });
}
