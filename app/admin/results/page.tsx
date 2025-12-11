"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type BetResult = "win" | "loss" | "push";

type StraightBet = {
  id: string;
  user_id: string;
  user_username: string | null;
  user_email: string | null;
  game: string | null;
  team: string | null;
  bet_type: string | null;
  odds: number | null;
  stake: number | null;
  created_at: string;
  result: BetResult | "pending" | null;
};

type ParlayLeg = {
  game: string | null;
  team: string | null;
  bet_type: string | null;
  odds: number | null;
};

type Parlay = {
  id: string;
  user_id: string;
  user_username: string | null;
  user_email: string | null;
  stake: number | null;
  created_at: string;
  result: BetResult | "pending" | null;
  parlay_legs?: ParlayLeg[];
};

export default function AdminResultsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [straightBets, setStraightBets] = useState<StraightBet[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);

  // --- Admin gate ---
  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const meta = user.user_metadata as any;
      const metadataFlag =
        meta?.is_admin === true || meta?.is_admin === "true";

      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const emailFlag =
        adminEmail &&
        user.email &&
        user.email.toLowerCase() === adminEmail.toLowerCase();

      const admin = Boolean(metadataFlag || emailFlag);
      setIsAdmin(admin);
      setAuthChecked(true);

      if (!admin) {
        router.replace("/");
      }
    }

    checkAdmin();
  }, [router]);

  // --- Load open bets/parlays ---
  useEffect(() => {
    if (!authChecked || !isAdmin) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Straight bets with no result yet (or pending)
        const { data: betsData, error: betsError } = await supabase
          .from("bets")
          .select(
            "id, user_id, user_username, user_email, game, team, bet_type, odds, stake, created_at, result"
          )
          .or("result.is.null,result.eq.pending")
          .order("created_at", { ascending: false });

        if (betsError) throw betsError;

        // Parlays with no result yet (or pending) + legs
        const { data: parlaysData, error: parlaysError } = await supabase
          .from("parlays")
          .select(
            "id, user_id, user_username, user_email, stake, created_at, result, parlay_legs (game, team, bet_type, odds)"
          )
          .or("result.is.null,result.eq.pending")
          .order("created_at", { ascending: false });

        if (parlaysError) throw parlaysError;

        setStraightBets((betsData || []) as StraightBet[]);
        setParlays((parlaysData || []) as Parlay[]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load bets");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [authChecked, isAdmin]);

  // --- Actions ---

  async function gradeStraightBet(id: string, result: BetResult) {
    try {
      setLoadingAction(`bet-${id}-${result}`);
      const { error } = await supabase
        .from("bets")
        .update({ result })
        .eq("id", id);

      if (error) throw error;

      // Remove from local list (or you could mark as graded)
      setStraightBets((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update bet");
    } finally {
      setLoadingAction(null);
    }
  }

  async function gradeParlay(id: string, result: BetResult) {
    try {
      setLoadingAction(`parlay-${id}-${result}`);
      const { error } = await supabase
        .from("parlays")
        .update({ result })
        .eq("id", id);

      if (error) throw error;

      setParlays((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update parlay");
    } finally {
      setLoadingAction(null);
    }
  }

  function formatUser(b: { user_username: string | null; user_email: string | null }) {
    return b.user_username || b.user_email || "Unknown";
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-300">Checking admin access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    // We’ll immediately redirect, so nothing to show here.
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin: Results</h1>
          <p className="text-sm text-slate-400">
            Grade open straight bets and parlays as{" "}
            <span className="text-emerald-300 font-medium">Win</span>,{" "}
            <span className="text-rose-300 font-medium">Loss</span>, or{" "}
            <span className="text-slate-100 font-medium">Push</span>. Once
            graded, they’ll be reflected in the leaderboard.
          </p>
        </header>

        {loading && (
          <p className="text-sm text-slate-300 mb-4">Loading open bets…</p>
        )}

        {error && (
          <p className="text-sm text-red-400 mb-4">Error: {error}</p>
        )}

        {/* Straight bets */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Open straight bets</h2>
            <span className="text-xs text-slate-400">
              {straightBets.length} open
            </span>
          </div>

          {straightBets.length === 0 && (
            <p className="text-sm text-slate-500">
              No straight bets waiting for grading.
            </p>
          )}

          <div className="space-y-2">
            {straightBets.map((bet) => (
              <div
                key={bet.id}
                className="bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-600">
                      Straight
                    </span>
                    <span className="font-medium">{formatUser(bet)}</span>
                    <span className="text-[11px] text-slate-500">
                      {formatDate(bet.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 text-[13px] text-slate-100">
                    {bet.team}{" "}
                    <span className="text-slate-400">
                      {bet.bet_type ? `(${bet.bet_type})` : ""}
                    </span>{" "}
                    {bet.odds != null && (
                      <span className="text-emerald-300 ml-1">
                        {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                      </span>
                    )}
                  </div>
                  {bet.game && (
                    <div className="text-[11px] text-slate-400">
                      {bet.game}
                    </div>
                  )}
                  {bet.stake != null && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Stake: ${bet.stake}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loadingAction !== null}
                    onClick={() => gradeStraightBet(bet.id, "win")}
                    className="text-xs px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Win
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction !== null}
                    onClick={() => gradeStraightBet(bet.id, "loss")}
                    className="text-xs px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
                  >
                    Loss
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction !== null}
                    onClick={() => gradeStraightBet(bet.id, "push")}
                    className="text-xs px-2 py-1 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50"
                  >
                    Push
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Parlays */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Open parlays</h2>
            <span className="text-xs text-slate-400">
              {parlays.length} open
            </span>
          </div>

          {parlays.length === 0 && (
            <p className="text-sm text-slate-500">
              No parlays waiting for grading.
            </p>
          )}

          <div className="space-y-2">
            {parlays.map((parlay) => (
              <div
                key={parlay.id}
                className="bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-600">
                        Parlay
                      </span>
                      <span className="font-medium">
                        {formatUser(parlay)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDate(parlay.created_at)}
                      </span>
                    </div>
                    {parlay.stake != null && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Stake: ${parlay.stake}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => gradeParlay(parlay.id, "win")}
                      className="text-xs px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Win
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => gradeParlay(parlay.id, "loss")}
                      className="text-xs px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
                    >
                      Loss
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => gradeParlay(parlay.id, "push")}
                      className="text-xs px-2 py-1 rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50"
                    >
                      Push
                    </button>
                  </div>
                </div>

                {parlay.parlay_legs && parlay.parlay_legs.length > 0 && (
                  <div className="mt-1 border-t border-slate-700 pt-2 space-y-1">
                    {parlay.parlay_legs.map((leg, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[12px] text-slate-200"
                      >
                        <div>
                          <span className="text-slate-500 mr-1">
                            Leg {idx + 1}:
                          </span>
                          {leg.team}{" "}
                          <span className="text-slate-400">
                            {leg.bet_type ? `(${leg.bet_type})` : ""}
                          </span>
                        </div>
                        {leg.odds != null && (
                          <span className="text-emerald-300">
                            {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
