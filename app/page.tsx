"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const meta = user.user_metadata as any;
      setUsername(meta?.username || user.email || null);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-300">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* No header here – TopNav comes from layout.tsx */}

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <section className="grid gap-6 md:grid-cols-[2fr,1.3fr] items-stretch">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-7 shadow-lg shadow-black/40">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 mb-2">
              Welcome back{username ? `, ${username}` : ""}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
              Track your action. See what your friends are riding.
            </h2>
            <p className="text-sm md:text-base text-slate-300 mb-6">
              Log your bets, build parlays, and keep an eye on the board. Share
              picks with friends and tail (or fade) their plays.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/bets/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-sm font-semibold text-white transition shadow-md shadow-emerald-500/20"
              >
                Place a bet
                <span className="text-xs">🎯</span>
              </Link>
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-100 border border-slate-700 transition"
              >
                View global feed
                <span className="text-xs">📡</span>
              </Link>
            </div>
          </div>

          {/* Quick stats / teaser section */}
          <div className="space-y-4">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-md shadow-black/30">
              <p className="text-xs text-slate-400 mb-1">Coming soon</p>
              <h3 className="text-sm font-semibold mb-2">
                Tonight&apos;s sweat dashboard
              </h3>
              <p className="text-xs text-slate-300 mb-3">
                A quick view of your open bets and how much you&apos;ve got
                riding tonight.
              </p>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full w-2/5 bg-emerald-500/80" />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                For now, check your{" "}
                <Link
                  href="/bets"
                  className="text-emerald-300 underline underline-offset-2"
                >
                  logged bets
                </Link>{" "}
                to see your recent action.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-4 text-xs text-slate-400">
              <p className="font-semibold mb-1 text-slate-200">
                Drink tracker & chat rooms
              </p>
              <p className="mb-1">
                You&apos;ll soon be able to track how many beers, shots, and
                mixed drinks you crush with the crew — and chat about every bad
                beat in real time.
              </p>
              <p className="text-[11px]">
                For now, we&apos;re focused on nailing down bets & parlays. 🧪
              </p>
            </div>
          </div>
        </section>

        {/* Navigation grid */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-[0.18em]">
            Navigate
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Card: Place a bet */}
            <Link
              href="/bets/new"
              className="group bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-400/70 hover:bg-slate-900 transition"
            >
              <div>
                <h4 className="text-base font-semibold mb-1 flex items-center gap-2">
                  Place a bet
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Live odds
                  </span>
                </h4>
                <p className="text-sm text-slate-300 mb-3">
                  Browse upcoming games, tap odds to auto-fill your slip, and
                  log single bets or parlays.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Open bet builder</span>
                <span className="group-hover:translate-x-1 transition">
                  ➜
                </span>
              </div>
            </Link>

            {/* Card: Global feed */}
            <Link
              href="/feed"
              className="group bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-400/70 hover:bg-slate-900 transition"
            >
              <div>
                <h4 className="text-base font-semibold mb-1 flex items-center gap-2">
                  Global feed
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Social
                  </span>
                </h4>
                <p className="text-sm text-slate-300 mb-3">
                  See what everyone is riding tonight. Tail your friends&apos;
                  plays or fade them for bragging rights.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>View latest bets</span>
                <span className="group-hover:translate-x-1 transition">
                  ➜
                </span>
              </div>
            </Link>

            {/* Card: My bets */}
            <Link
              href="/bets"
              className="group bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-400/70 hover:bg-slate-900 transition"
            >
              <div>
                <h4 className="text-base font-semibold mb-1 flex items-center gap-2">
                  My bets
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    History
                  </span>
                </h4>
                <p className="text-sm text-slate-300 mb-3">
                  Review all the bets you&apos;ve logged, track your action
                  over time, and see how hot (or cold) you&apos;ve been.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Open bet history</span>
                <span className="group-hover:translate-x-1 transition">
                  ➜
                </span>
              </div>
            </Link>
          </div>

          {/* Future feature cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-4">
              <h4 className="text-sm font-semibold mb-1">Drink tracker</h4>
              <p className="text-xs text-slate-300 mb-1">
                Log beers, mixed drinks, and shots. See totals by night, week,
                and year. Compare with friends for “hydration” leaderboards.
              </p>
              <p className="text-[11px] text-slate-500">Planned feature.</p>
            </div>
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-4">
              <h4 className="text-sm font-semibold mb-1">Friends & chat</h4>
              <p className="text-xs text-slate-300 mb-1">
                Real-time chat rooms with your crew, game threads, and
                notifications like &quot;Tom1112 is riding Oklahoma ML
                tonight…&quot;
              </p>
              <p className="text-[11px] text-slate-500">Planned feature.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
