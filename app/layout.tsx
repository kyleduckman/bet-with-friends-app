"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import TopNav from "@/components/TopNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide TopNav on auth routes (login, signup, forgot-password, etc)
  const hideNav = pathname?.startsWith("/auth");

  return (
    <html lang="en">
      <body className="bg-slate-950 text-white min-h-screen">
        {!hideNav && <TopNav />}
        <main>{children}</main>
      </body>
    </html>
  );
}
