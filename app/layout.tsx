import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bet With Friends",
  description: "Track bets and ride with your friends.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-slate-950 text-white"}>
        <TopNav />
        {/* padding so content isn't glued to the header */}
        <main className="pt-4">{children}</main>
      </body>
    </html>
  );
}
