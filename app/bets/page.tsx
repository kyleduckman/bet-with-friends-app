"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Bet = {
  id: string;
  user_email: string | null;
  user_username: string | null;
  game: string | null;
  team: string;
  bet_type: string | null;
  odds: number | null;
  stake: number | null;
  created_at: string;
};

export default function MyBetsPage() {
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBets() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setBets((data as Bet[]) || []);
      }

      setLoading(false);
    }

    loadBets();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-200">Loading your bets...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Bets</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/bets/new")}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold"
          >
            + New Bet
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-md text-xs"
          >
            Home
          </button>
        </div>
      </div>

      {bets.length === 0 && (
        <p className="text-slate-300">
          You haven&apos;t logged any bets yet. Hit &quot;New Bet&quot; to fire
          your first one.
        </p>
      )}

      <div className="space-y-4">
        {bets.map((bet) => (
          <div
            key={bet.id}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold">
                {bet.team} {bet.bet_type}
                {bet.odds !== null && (
                  <span className="ml-1 text-emerald-300 text-sm">
                    ({bet.odds > 0 ? `+${bet.odds}` : bet.odds})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {new Date(bet.created_at).toLocaleString()}
              </div>
            </div>

            {bet.game && (
              <div className="text-sm text-slate-300 mb-1">Game: {bet.game}</div>
            )}

            <div className="text-xs text-slate-400">
              {bet.stake !== null && <span>Stake: ${bet.stake}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
