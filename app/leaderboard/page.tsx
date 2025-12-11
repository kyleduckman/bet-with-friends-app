"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type RawBet = {
  id: string;
  user_id: string;
  user_username: string | null;
  user_email: string | null;
  result: "pending" | "win" | "loss" | "push" | null;
};

type RawParlay = {
  id: string;
  user_id: string;
  user_username: string | null;
  user_email: string | null;
  result: "pending" | "win" | "loss" | "push" | null;
};

type UserStats = {
  user_id: string;
  username: string | null;
  email: string | null;

  straightWins: number;
  straightLosses: number;
  straightPushes: number;

  parlayWins: number;
  parlayLosses: number;
  parlayPushes: number;

  // derived fields
  totalWins: number;
  totalLosses: number;
  totalPushes: number;
  totalDecisions: number; // wins + losses (pushes don’t count)
  winPct: number; // 0–1
};

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats[]>([]);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError(null);

      try {
        // 1) fetch graded straight bets
        const { data: betsData, error: betsError } = await supabase
          .from("bets")
          .select(
            "id, user_id, user_username, user_email, result"
          )
          .in("result", ["win", "loss", "push"]);

        if (betsError) throw betsError;

        // 2) fetch graded parlays
        const { data: parlaysData, error: parlaysError } = await supabase
          .from("parlays")
          .select(
            "id, user_id, user_username, user_email, result"
          )
          .in("result", ["win", "loss", "push"]);

        if (parlaysError) throw parlaysError;

        const bets = (betsData || []) as RawBet[];
        const parlays = (parlaysData || []) as RawParlay[];

        // 3) accumulate per-user stats
        const byUser = new Map<string, UserStats>();

        function getOrInit(user_id: string, username: string | null, email: string | null) {
          if (!byUser.has(user_id)) {
            byUser.set(user_id, {
              user_id,
              username,
              email,
              straightWins: 0,
              straightLosses: 0,
              straightPushes: 0,
              parlayWins: 0,
              parlayLosses: 0,
              parlayPushes: 0,
              totalWins: 0,
              totalLosses: 0,
              totalPushes: 0,
              totalDecisions: 0,
              winPct: 0,
            });
          }
          return byUser.get(user_id)!;
        }

        // straight bets
        for (const b of bets) {
          if (!b.user_id || !b.result) continue;
          const u = getOrInit(b.user_id, b.user_username, b.user_email);

          if (b.result === "win") u.straightWins += 1;
          else if (b.result === "loss") u.straightLosses += 1;
          else if (b.result === "push") u.straightPushes += 1;
        }

        // parlays
        for (const p of parlays) {
          if (!p.user_id || !p.result) continue;
          const u = getOrInit(p.user_id, p.user_username, p.user_email);

          if (p.result === "win") u.parlayWins += 1;
          else if (p.result === "loss") u.parlayLosses += 1;
          else if (p.result === "push") u.parlayPushes += 1;
        }

        // 4) compute derived totals / win pct
        const allStats: UserStats[] = [];

        for (const u of byUser.values()) {
          const totalWins = u.straightWins + u.parlayWins;
          const totalLosses = u.straightLosses + u.parlayLosses;
          const totalPushes = u.straightPushes + u.parlayPushes;
          const totalDecisions = totalWins + totalLosses; // pushes don’t count

          const winPct = totalDecisions > 0 ? totalWins / totalDecisions : 0;

          allStats.push({
            ...u,
            totalWins,
            totalLosses,
            totalPushes,
            totalDecisions,
            winPct,
          });
        }

        setStats(allStats);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const MIN_DECISIONS = 3; // require at least 3 graded bets to show up

  const eligible = stats.filter((u) => u.totalDecisions >= MIN_DECISIONS);

  const hot = [...eligible]
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, 5);

  const cold = [...eligible]
    .sort((a, b) => a.winPct - b.winPct)
    .slice(0, 5)
    .reverse(); // so worst is at bottom like 10., 9. etc.

  function formatName(u: UserStats) {
    return u.username || u.email || "Unknown";
  }

  function formatRecord(u: UserStats) {
    return `${u.totalWins}-${u.totalLosses}-${u.totalPushes}`;
  }

  function formatPct(u: UserStats) {
    return `${(u.winPct * 100).toFixed(1)}%`;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Leaderboard</h1>
          <p className="text-sm text-slate-400">
            Records are based on graded bets only (wins / losses / pushes). Parlays are tracked
            separately but included in overall records.
          </p>
        </header>

        {loading && (
          <p className="text-sm text-slate-300">Loading records…</p>
        )}

        {error && (
          <p className="text-sm text-red-400 mb-4">Error: {error}</p>
        )}

        {!loading && !error && eligible.length === 0 && (
          <p className="text-sm text-slate-400">
            No graded bets yet. Once you mark results in the admin console, records will appear here.
          </p>
        )}

        {eligible.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* HOT */}
            <section className="bg-slate-800 border border-emerald-500/40 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-emerald-300">
                  HOT 🔥
                </h2>
                <span className="text-[11px] text-slate-400">
                  Min {MIN_DECISIONS} decisions
                </span>
              </div>
              <div className="space-y-2">
                {hot.map((u, idx) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between text-sm bg-slate-900/70 rounded-lg px-3 py-2 border border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-4 text-right">
                        {idx + 1}.
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium">{formatName(u)}</span>
                        <span className="text-[11px] text-slate-400">
                          {u.totalDecisions} decisions • {formatPct(u)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {formatRecord(u)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Straight: {u.straightWins}-{u.straightLosses}-
                        {u.straightPushes} • Parlays: {u.parlayWins}-
                        {u.parlayLosses}-{u.parlayPushes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ICE COLD */}
            <section className="bg-slate-800 border border-sky-500/30 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-sky-300">
                  ICE COLD 🧊
                </h2>
                <span className="text-[11px] text-slate-400">
                  Min {MIN_DECISIONS} decisions
                </span>
              </div>
              <div className="space-y-2">
                {cold.map((u, idx) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between text-sm bg-slate-900/70 rounded-lg px-3 py-2 border border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-4 text-right">
                        {cold.length - idx}.
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium">{formatName(u)}</span>
                        <span className="text-[11px] text-slate-400">
                          {u.totalDecisions} decisions • {formatPct(u)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {formatRecord(u)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Straight: {u.straightWins}-{u.straightLosses}-
                        {u.straightPushes} • Parlays: {u.parlayWins}-
                        {u.parlayLosses}-{u.parlayPushes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
