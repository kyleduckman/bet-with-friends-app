// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";

// type LiveGame = {
//   id: string;
//   sport: string;
//   commenceTime: string;
//   status: string;
//   homeTeam: string;
//   awayTeam: string;
//   homeScore: number | null;
//   awayScore: number | null;
// };

// type BetRow = {
//   id: string;
//   game: string | null;
//   team: string | null;
//   bet_type: string | null;
//   odds: number | null;
//   user_username: string | null;
//   user_email: string | null;
//   created_at: string;
// };

// type BetsByGame = Record<string, BetRow[]>;

// function gameKey(g: LiveGame) {
//   // This matches how you store `game` when placing bets:
//   // `${awayTeam} @ ${homeTeam}`
//   return `${g.awayTeam} @ ${g.homeTeam}`;
// }

// function formatOdds(odds: number | null) {
//   if (odds == null) return "";
//   return odds > 0 ? `+${odds}` : odds.toString();
// }

// function formatStatus(game: LiveGame) {
//   if (game.status) return game.status;
//   const dt = game.commenceTime ? new Date(game.commenceTime) : null;
//   if (!dt) return "";
//   return dt.toLocaleTimeString(undefined, {
//     hour: "numeric",
//     minute: "2-digit",
//   });
// }

// export default function LiveScoresPage() {
//   const router = useRouter();

//   const [games, setGames] = useState<LiveGame[]>([]);
//   const [betsByGame, setBetsByGame] = useState<BetsByGame>({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function load() {
//       setLoading(true);
//       setError(null);

//       try {
//         // 1. Fetch live games
//         const res = await fetch("/api/live-scores");
//         if (!res.ok) {
//           const body = await res.json().catch(() => ({}));
//           throw new Error(body.error || "Failed to load live scores");
//         }
//         const json = await res.json();
//         const liveGames: LiveGame[] = json.games || [];
//         setGames(liveGames);

//         // 2. If no live games, no need to query bets
//         if (!liveGames.length) {
//           setBetsByGame({});
//           setLoading(false);
//           return;
//         }

//         const keys = liveGames.map(gameKey);

//         // 3. Load ALL bets for these games (across all users)
//         const { data: betRows, error: betsError } = await supabase
//           .from("bets")
//           .select(
//             "id, game, team, bet_type, odds, user_username, user_email, created_at"
//           )
//           .in("game", keys);

//         if (betsError) {
//           console.error(betsError);
//           throw new Error(betsError.message);
//         }

//         const grouped: BetsByGame = {};
//         for (const bet of (betRows || []) as BetRow[]) {
//           const key = bet.game || "";
//           if (!key) continue;
//           if (!grouped[key]) grouped[key] = [];
//           grouped[key].push(bet);
//         }

//         setBetsByGame(grouped);
//         setLoading(false);
//       } catch (err: any) {
//         console.error(err);
//         setError(err.message || "Error loading live scores");
//         setLoading(false);
//       }
//     }

//     load();

//     // Optional: auto-refresh every 30s
//     const id = setInterval(load, 30_000);
//     return () => clearInterval(id);
//   }, []);

//   return (
//     <div className="min-h-screen bg-slate-900 text-white">
//       <div className="max-w-6xl mx-auto px-4 py-8">
//         <header className="mb-6 flex items-center justify-between gap-3">
//           <div>
//             <h1 className="text-3xl font-bold">Live scores</h1>
//             <p className="text-sm text-slate-400">
//               See what&apos;s on right now and who&apos;s riding each game.
//             </p>
//           </div>
//           <button
//             onClick={() => router.push("/bets/new")}
//             className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-sm font-semibold"
//           >
//             Place a bet
//           </button>
//         </header>

//         {loading && (
//           <p className="text-slate-300 text-sm">Loading live scores…</p>
//         )}

//         {error && (
//           <p className="text-sm text-red-400 mb-4">Error: {error}</p>
//         )}

//         {!loading && !error && games.length === 0 && (
//           <p className="text-sm text-slate-400">
//             No live games right now. Check back later or{" "}
//             <button
//               className="text-emerald-400 underline underline-offset-2"
//               onClick={() => router.push("/bets/new")}
//             >
//               browse upcoming odds
//             </button>
//             .
//           </p>
//         )}

//         <div className="grid gap-4 md:grid-cols-2">
//           {games.map((g) => {
//             const key = gameKey(g);
//             const bets = betsByGame[key] || [];
//             const uniqueUsers = new Set(
//               bets.map(
//                 (b) =>
//                   b.user_username ||
//                   b.user_email ||
//                   `user-${b.id.slice(0, 4)}`
//               )
//             );
//             return (
//               <div
//                 key={g.id}
//                 className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3"
//               >
//                 {/* SCOREBOARD */}
//                 <div className="flex items-center justify-between gap-3">
//                   <div className="text-xs uppercase tracking-wide text-slate-400">
//                     {g.sport}
//                   </div>
//                   <div className="text-xs text-emerald-300">
//                     {formatStatus(g)}
//                   </div>
//                 </div>

//                 <div className="flex items-center justify-between gap-6">
//                   <div className="flex-1">
//                     <div className="text-xs text-slate-400 mb-1">
//                       Away
//                     </div>
//                     <div className="flex items-center justify-between gap-2">
//                       <div className="font-semibold truncate">
//                         {g.awayTeam}
//                       </div>
//                       <div className="text-2xl font-bold">
//                         {g.awayScore ?? "-"}
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex-1">
//                     <div className="text-xs text-slate-400 mb-1">
//                       Home
//                     </div>
//                     <div className="flex items-center justify-between gap-2">
//                       <div className="font-semibold truncate">
//                         {g.homeTeam}
//                       </div>
//                       <div className="text-2xl font-bold">
//                         {g.homeScore ?? "-"}
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* BETS SUMMARY */}
//                 <div className="mt-1">
//                   <div className="flex items-center justify-between mb-1">
//                     <div className="text-xs text-slate-400">
//                       {bets.length === 0 ? (
//                         <>No bets logged on this game yet.</>
//                       ) : (
//                         <>
//                           {bets.length} bet
//                           {bets.length === 1 ? "" : "s"} from{" "}
//                           {uniqueUsers.size}{" "}
//                           user{uniqueUsers.size === 1 ? "" : "s"}
//                         </>
//                       )}
//                     </div>
//                   </div>

//                   {bets.length > 0 && (
//                     <div className="border border-slate-700 rounded-md bg-slate-900/70 max-h-40 overflow-auto">
//                       {bets.map((b) => {
//                         const displayName =
//                           b.user_username ||
//                           b.user_email ||
//                           "Someone";
//                         return (
//                           <div
//                             key={b.id}
//                             className="px-3 py-2 flex justify-between gap-3 text-xs border-b border-slate-800 last:border-b-0"
//                           >
//                             <div>
//                               <div className="font-medium">
//                                 {displayName}
//                               </div>
//                               <div className="text-slate-300">
//                                 {b.team}{" "}
//                                 {b.bet_type && (
//                                   <span className="text-slate-400">
//                                     ({b.bet_type})
//                                   </span>
//                                 )}{" "}
//                                 {b.odds != null && (
//                                   <span className="text-emerald-300">
//                                     {formatOdds(b.odds)}
//                                   </span>
//                                 )}
//                               </div>
//                             </div>
//                             <div className="text-[10px] text-slate-500 whitespace-nowrap">
//                               {new Date(b.created_at).toLocaleTimeString(
//                                 undefined,
//                                 {
//                                   hour: "numeric",
//                                   minute: "2-digit",
//                                 }
//                               )}
//                             </div>
//                           </div>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }


export default function LiveScoresPage() {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex justify-center p-6">
        <div className="max-w-3xl w-full text-center mt-24">
          <h1 className="text-3xl font-bold mb-4">Live Scores</h1>
  
          <div className="mt-6 p-6 rounded-xl border border-slate-700 bg-slate-800/60">
            <h2 className="text-xl font-semibold text-emerald-300 mb-2">
              Feature Coming Soon
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Real-time game updates, live scoreboards, and tracking what your
              friends are riding will be available here soon.  
              <br />
            </p>
  
            <div className="mt-4 text-xs text-slate-500">
              Stay tuned — this page will update the moment live tracking is ready.
            </div>
          </div>
        </div>
      </div>
    );
  }
  