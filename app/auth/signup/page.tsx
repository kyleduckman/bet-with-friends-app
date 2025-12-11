"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

const BETA_CODE = process.env.NEXT_PUBLIC_BETA_INVITE_CODE;

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!BETA_CODE) {
      setError(
        "Beta invite code is not configured. Ask the owner to set NEXT_PUBLIC_BETA_INVITE_CODE."
      );
      return;
    }

    if (inviteCode.trim() !== BETA_CODE) {
      setError("Invalid invite code. Please contact the owner for access.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.user) {
      setError("Signup failed. Please try again.");
      return;
    }

    setSuccess(
      "Account created! Check your email to confirm your address, then you can log in."
    );

    // Optionally redirect to login after a short delay
    setTimeout(() => {
      router.replace("/auth/login");
    }, 2500);
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
                Private beta — invite only.
              </p>
            </div> */}
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">
            Request access & sign up
          </h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Invite code
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="Enter the code from Kyle"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="tom1112"
              />
            </div>

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

            {success && (
              <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800 rounded-md px-3 py-2">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white py-2.5 rounded-md transition"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              Log in
            </Link>
          </div>

          <div className="mt-4 text-[11px] text-slate-500">
            This app is a hobby project and does not handle real money. It&apos;s
            for tracking bets with friends only.
          </div>
        </div>
      </div>
    </div>
  );
}
