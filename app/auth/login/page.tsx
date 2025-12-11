"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.session) {
      setError("Login failed. Please try again.");
      return;
    }

    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex flex-col items-center gap-3">
            <Image
              src="/bwf-high-resolution-logo-transparent.png" // make sure this file exists in /public
              alt="Bet With Friends Logo"
              width={450}
              height={56}
              className="rounded-xl shadow-lg"
              priority
            />
            {/* <div className="text-center">
              <h1 className="text-xl font-semibold text-white">
                Bet With Friends
              </h1>
              <p className="text-xs text-slate-400">
                Ride with the squad. Fade at your own risk.
              </p>
            </div> */}
          </Link>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">
            Log in
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white py-2.5 rounded-md transition"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          {/* Bottom actions */}
          <div className="mt-4 text-center text-xs text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              Request access & sign up
            </Link>
          </div>

          {/* Beta notice */}
          <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-3 text-[11px] text-amber-200">
            <div className="font-semibold mb-1 uppercase tracking-wide text-[10px]">
              Private beta
            </div>
            <p>
              This app is currently in beta and for testing with friends only.
              New signups require an invite code provided by the owner.
              Please do not wager real money based on anything you see here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
