"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Bet = {
  id: string;
  game: string | null;
  team: string | null;
  bet_type: string | null;
  odds: number | null;
  stake: number | null;
  note: string | null;
  created_at: string;
};

type ParlayLeg = {
  game: string | null;
  team: string | null;
  bet_type: string | null;
  odds: number | null;
};

type Parlay = {
  id: string;
  user_username: string | null;
  combined_odds: number | null; // column we store parlay odds in
  created_at: string;
  parlay_legs: ParlayLeg[];
};

export default function MyBetsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<Bet[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      // 1. Make sure user is logged in
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError("You must be logged in to view your bets.");
        router.replace("/auth/login");
        return;
      }

      const user = userData.user;

      // 2. Load single bets
      const { data: betRows, error: betsError } = await supabase
        .from("bets")
        .select(
          "id, game, team, bet_type, odds, stake, note, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (betsError) {
        console.error(betsError);
        setError(betsError.message);
        setLoading(false);
        return;
      }

      // 3. Load parlays + legs for this user
      const { data: parlayRows, error: parlaysError } = await supabase
        .from("parlays")
        .select(
          `
            id,
            user_username,
            combined_odds,
            created_at,
            parlay_legs (
              game,
              team,
              bet_type,
              odds
            )
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (parlaysError) {
        console.error(parlaysError);
        setError(parlaysError.message);
        setLoading(false);
        return;
      }

      setBets((betRows || []) as Bet[]);
      setParlays((parlayRows || []) as unknown as Parlay[]);
      setLoading(false);
    }

    load();
  }, [router]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatOdds(odds: number | null) {
    if (odds == null) return "-";
    return odds > 0 ? `+${odds}` : odds.toString();
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">My bets</h1>
          <p className="text-sm text-slate-400">
            See all the single bets and parlays you&apos;ve logged.
          </p>
        </header>

        {loading && (
          <p className="text-slate-300 text-sm">Loading your bets...</p>
        )}

        {error && (
          <p className="text-red-400 text-sm mb-4">Error: {error}</p>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {/* SINGLE BETS */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Single bets</h2>
                <span className="text-xs text-slate-400">
                  {bets.length} bet{bets.length === 1 ? "" : "s"}
                </span>
              </div>

              {bets.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No single bets logged yet. Head to{" "}
                  <button
                    className="text-emerald-400 underline underline-offset-2"
                    onClick={() => router.push("/bets/new")}
                  >
                    Place a bet
                  </button>{" "}
                  to log your action.
                </p>
              ) : (
                <div className="space-y-2">
                  {bets.map((bet) => (
                    <div
                      key={bet.id}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm flex justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold">
                          {bet.team}{" "}
                          {bet.bet_type && (
                            <span className="text-slate-300">
                              ({bet.bet_type})
                            </span>
                          )}{" "}
                          {bet.odds != null && (
                            <span className="text-emerald-300">
                              {formatOdds(bet.odds)}
                            </span>
                          )}
                        </div>
                        {bet.game && (
                          <div className="text-xs text-slate-400">
                            {bet.game}
                          </div>
                        )}
                        {bet.note && (
                          <div className="text-xs text-slate-300">
                            {bet.note}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <div className="text-[11px] text-slate-400">
                          {formatDate(bet.created_at)}
                        </div>
                        {bet.stake != null && (
                          <div className="text-xs text-slate-200">
                            Stake: ${bet.stake}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* PARLAYS */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Parlays</h2>
                <span className="text-xs text-slate-400">
                  {parlays.length} parlay{parlays.length === 1 ? "" : "s"}
                </span>
              </div>

              {parlays.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No parlays logged yet. Switch to{" "}
                  <button
                    className="text-emerald-400 underline underline-offset-2"
                    onClick={() => router.push("/bets/new")}
                  >
                    Parlay mode
                  </button>{" "}
                  on the bet builder to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {parlays.map((parlay) => (
                    <div
                      key={parlay.id}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="font-semibold">
                            {parlay.parlay_legs.length}-leg parlay{" "}
                            {parlay.combined_odds != null && (
                              <span className="text-emerald-300 ml-1">
                                ({formatOdds(parlay.combined_odds)})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            Logged {formatDate(parlay.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-700/80 rounded-md divide-y divide-slate-700/80 bg-slate-900/60">
                        {parlay.parlay_legs.map((leg, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 flex justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-medium">
                                {leg.team}{" "}
                                {leg.bet_type && (
                                  <span className="text-slate-300">
                                    ({leg.bet_type})
                                  </span>
                                )}{" "}
                                {leg.odds != null && (
                                  <span className="text-emerald-300">
                                    {formatOdds(leg.odds)}
                                  </span>
                                )}
                              </div>
                              {leg.game && (
                                <div className="text-[11px] text-slate-400">
                                  {leg.game}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
