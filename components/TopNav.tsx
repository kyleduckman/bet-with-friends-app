"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        setDisplayName(null);
        setIsAdmin(false);
        return;
      }

      const meta = user.user_metadata as any;

      // Display name (username first, then email)
      setDisplayName(meta?.username || user.email || null);

      // --- Admin detection ---
      // 1) user_metadata.is_admin might be boolean or string
      const metadataFlag =
        meta?.is_admin === true || meta?.is_admin === "true";

      // 2) Fallback: env var for your email
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const emailFlag =
        adminEmail && user.email && user.email.toLowerCase() === adminEmail.toLowerCase();

      const admin = Boolean(metadataFlag || emailFlag);
      setIsAdmin(admin);

      // Helpful in case we need to debug later:
      console.log("TopNav user meta:", meta, "isAdmin?", admin);
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
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/live", label: "Live scores" },
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
            <Image
              src="/bwf-high-resolution-logo-transparent.png"
              alt="Bet With Friends Logo"
              width={200
              }
              height={32}
              className="rounded-lg"
              priority
            />
            {/* <div>
              <div className="text-sm font-semibold leading-tight">
                Bet With Friends
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                Ride with the squad.
              </div>
            </div> */}
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

          {/* Admin-only nav link */}
          {isAdmin && (
            <Link
              href="/admin/results"
              className={[
                "px-3 py-1 rounded-full border text-xs font-medium transition",
                pathname?.startsWith("/admin")
                  ? "bg-amber-500/10 border-amber-400 text-amber-200"
                  : "border-amber-500/60 text-amber-200 hover:bg-amber-500/10",
              ].join(" ")}
            >
              Results
            </Link>
          )}
        </nav>

        {/* Right: user + auth */}
        <div className="flex items-center gap-3">
          {displayName && (
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium text-slate-100">
                  {displayName}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => router.push("/admin/results")}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400 text-amber-200 bg-amber-500/10 uppercase tracking-wide"
                  >
                    Admin
                  </button>
                )}
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
