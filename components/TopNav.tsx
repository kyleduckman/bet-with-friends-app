"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setDisplayName(null);
        return;
      }

      const meta = user.user_metadata as any;
      setDisplayName(meta?.username || user.email || null);
    }

    loadUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  const links = [
    { href: "/", label: "Home" },
    { href: "/feed", label: "Global feed" },
    { href: "/bets/new", label: "Place a bet" },
    { href: "/bets", label: "My bets" },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Left: logo/title */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition"
          >
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-xs font-black">
              BF
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">
                Bet With Friends
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                Ride with the squad.
              </div>
            </div>
          </Link>
        </div>

        {/* Middle: nav links */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "px-3 py-1 rounded-full border text-xs font-medium transition",
                  active
                    ? "bg-emerald-500/10 border-emerald-400 text-emerald-200"
                    : "border-slate-800 text-slate-300 hover:bg-slate-900",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: user + auth */}
        <div className="flex items-center gap-3">
          {displayName && (
            <div className="hidden sm:block text-right">
              <div className="text-xs font-medium text-slate-100">
                {displayName}
              </div>
              <div className="text-[11px] text-slate-400">Logged in</div>
            </div>
          )}
          {displayName ? (
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => router.push("/auth/login")}
              className="text-xs px-3 py-1.5 rounded-full border border-emerald-500 text-emerald-200 hover:bg-emerald-600/20 transition"
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
