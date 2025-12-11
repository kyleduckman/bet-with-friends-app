// import { NextResponse } from "next/server";

// type LiveGame = {
//   id: string;
//   sport: string;
//   commenceTime: string;
//   status: string; // e.g. "Q3 05:11", "Final", etc
//   homeTeam: string;
//   awayTeam: string;
//   homeScore: number | null;
//   awayScore: number | null;
// };

// // Reuse same sports list as /bets/new
// const SPORTS = [
//   { key: "americanfootball_nfl", label: "NFL" },
//   { key: "americanfootball_ncaaf", label: "NCAAF" },
//   { key: "basketball_nba", label: "NBA" },
//   { key: "basketball_ncaab", label: "NCAAB" },
//   { key: "baseball_mlb", label: "MLB" },
//   { key: "icehockey_nhl", label: "NHL" },
//   { key: "soccer_epl", label: "EPL" },
// ];

// export async function GET() {
//   const apiKey = process.env.ODDS_API_KEY;
//   if (!apiKey) {
//     return NextResponse.json(
//       { error: "Missing ODDS_API_KEY env var" },
//       { status: 500 }
//     );
//   }

//   try {
//     const allGames: LiveGame[] = [];

//     // The Odds API scores endpoint is per sport:
//     //   GET /v4/sports/{sport_key}/scores/?daysFrom=1&apiKey=...
//     for (const sport of SPORTS) {
//       const sportKey = sport.key;

//       const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=1&apiKey=${apiKey}`;

//       const res = await fetch(url, { cache: "no-store" });
//       if (!res.ok) {
//         // Log but don't kill the whole response for one bad sport
//         console.error(
//           `Live scores error for ${sportKey}:`,
//           res.status,
//           await res.text()
//         );
//         continue;
//       }

//       const raw = await res.json();

//       if (!Array.isArray(raw)) continue;

//       const gamesForSport: LiveGame[] = raw.map((g: any) => {
//         // Scores come as [{ name, score }, ...]
//         const scoresArray = Array.isArray(g.scores) ? g.scores : [];
//         const homeScoreObj = scoresArray.find(
//           (s: any) => s.name === g.home_team
//         );
//         const awayScoreObj = scoresArray.find(
//           (s: any) => s.name === g.away_team
//         );

//         const homeScore =
//           homeScoreObj && homeScoreObj.score != null
//             ? Number(homeScoreObj.score)
//             : null;
//         const awayScore =
//           awayScoreObj && awayScoreObj.score != null
//             ? Number(awayScoreObj.score)
//             : null;

//         const status = g.completed ? "Final" : "Live";

//         return {
//           id:
//             g.id ??
//             `${g.sport_key}-${g.commence_time}-${g.home_team}-${g.away_team}`,
//           sport: g.sport_key ?? sportKey,
//           commenceTime: g.commence_time ?? "",
//           status,
//           homeTeam: g.home_team,
//           awayTeam: g.away_team,
//           homeScore,
//           awayScore,
//         };
//       });

//       allGames.push(...gamesForSport);
//     }

//     return NextResponse.json({ games: allGames });
//   } catch (err) {
//     console.error("Unexpected error in live scores route:", err);
//     return NextResponse.json(
//       { error: "Unexpected error fetching live scores" },
//       { status: 500 }
//     );
//   }
// }
