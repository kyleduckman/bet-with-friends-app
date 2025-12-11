"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Outcome = { name: string; price: number };
type Game = {
  id: string;
  sport: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  outcomes: Outcome[];
};

type DraftLeg = {
  sport: string;
  game: string;
  team: string;
  betType: string;
  odds: number;
};

const SPORTS = [
  { key: "americanfootball_nfl", label: "NFL" },
  { key: "americanfootball_ncaaf", label: "NCAAF" },
  { key: "basketball_nba", label: "NBA" },
  { key: "basketball_ncaab", label: "NCAAB" },
  { key: "baseball_mlb", label: "MLB" },
  { key: "icehockey_nhl", label: "NHL" },
  { key: "soccer_epl", label: "EPL" },
];

// ---------- Inner page that actually uses hooks like useSearchParams ----------

function NewBetPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // mode + parlay legs
  const [mode, setMode] = useState<"single" | "parlay">("single");
  const [legs, setLegs] = useState<DraftLeg[]>([]);

  // which outcomes are selected (for green highlight)
  const [selectedOutcomeKeys, setSelectedOutcomeKeys] = useState<string[]>([]);

  // Picks banner visibility
  const [showPicksPanel, setShowPicksPanel] = useState(false);

  // read initial values from query params (for "Tail this bet")
  const [game, setGame] = useState(() => searchParams.get("game") || "");
  const [team, setTeam] = useState(() => searchParams.get("team") || "");
  const [betType, setBetType] = useState(
    () => searchParams.get("betType") || ""
  );
  const [odds, setOdds] = useState(() => searchParams.get("odds") || "");
  const [stake, setStake] = useState("");

  const [selectedSport, setSelectedSport] = useState(SPORTS[0].key);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch odds whenever selectedSport changes
  useEffect(() => {
    async function loadGames() {
      setLoadingGames(true);
      setGamesError(null);
      try {
        const res = await fetch(`/api/odds?sport=${selectedSport}`);
        if (!res.ok) {
          throw new Error("Failed to load odds");
        }
        const json = await res.json();
        setGames(json.games || []);
      } catch (err: any) {
        console.error(err);
        setGamesError(err.message || "Error loading games");
      } finally {
        setLoadingGames(false);
      }
    }
    loadGames();
  }, [selectedSport]);

  function selectBet(g: Game, outcome: Outcome) {
    const key = `${g.id}-${outcome.name}`;

    if (mode === "single") {
      // Only one active pick in single mode
      setSelectedOutcomeKeys([key]);
      setGame(`${g.awayTeam} @ ${g.homeTeam}`);
      setTeam(outcome.name);
      setBetType("ML");
      setOdds(String(outcome.price));
      setShowPicksPanel(true);
    } else {
      // Parlay: toggle legs
      setSelectedOutcomeKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );

      setLegs((prev) => {
        const existingIndex = prev.findIndex(
          (leg) =>
            leg.game === `${g.awayTeam} @ ${g.homeTeam}` &&
            leg.team === outcome.name
        );
        if (existingIndex >= 0) {
          // Remove leg if already there
          const copy = [...prev];
          copy.splice(existingIndex, 1);
          return copy;
        }
        // Add leg
        return [
          ...prev,
          {
            sport: g.sport,
            game: `${g.awayTeam} @ ${g.homeTeam}`,
            team: outcome.name,
            betType: "ML",
            odds: outcome.price,
          },
        ];
      });

      setShowPicksPanel(true);
    }
  }

  async function submitSingleBet() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      alert("You must be logged in to place a bet.");
      setLoading(false);
      router.replace("/auth/login");
      return;
    }

    const user = userData.user;
    const username =
      (user.user_metadata && (user.user_metadata as any).username) || null;

    const { error } = await supabase.from("bets").insert({
      user_id: user.id,
      user_email: user.email,
      user_username: username,
      game,
      team,
      bet_type: betType,
      odds: odds ? parseInt(odds, 10) : null,
      stake: stake ? Number(stake) : null,
      note: `${team} ${betType || ""}`.trim(),
    });

    setLoading(false);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Bet saved!");
    router.push("/bets");
  }

  async function handleSubmitSingle(e: React.FormEvent) {
    e.preventDefault();
    await submitSingleBet();
  }

  async function handleSubmitParlay() {
    if (legs.length < 2) {
      alert("You need at least 2 legs for a parlay.");
      return;
    }

    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      alert("You must be logged in to place a parlay.");
      setLoading(false);
      router.replace("/auth/login");
      return;
    }

    const user = userData.user;
    const username =
      (user.user_metadata && (user.user_metadata as any).username) || null;

    // 1. create parlay row
    const { data: parlayRow, error: parlayError } = await supabase
      .from("parlays")
      .insert({
        user_id: user.id,
        user_email: user.email,
        user_username: username,
        stake: stake ? Number(stake) : null,
        potential_payout: null, // compute later if you want
      })
      .select()
      .single();

    if (parlayError || !parlayRow) {
      console.error(parlayError);
      alert(parlayError?.message || "Failed to create parlay");
      setLoading(false);
      return;
    }

    const parlayId = parlayRow.id;

    // 2. insert legs
    const legsToInsert = legs.map((leg) => ({
      parlay_id: parlayId,
      sport: leg.sport,
      game: leg.game,
      team: leg.team,
      bet_type: leg.betType,
      odds: leg.odds,
      line: null,
    }));

    const { error: legsError } = await supabase
      .from("parlay_legs")
      .insert(legsToInsert);

    setLoading(false);

    if (legsError) {
      console.error(legsError);
      alert(legsError.message);
      return;
    }

    alert("Parlay placed!");
    router.push("/feed");
  }

  // counts for Picks banner
  const singleHasPick = !!(game && team);
  const picksCount = mode === "single" ? (singleHasPick ? 1 : 0) : legs.length;

  // simple parlay odds calculation (optional, invisible if no legs)
  function calculateParlayDecimalOdds(): number | null {
    if (!legs.length) return null;
    let product = 1;
    for (const leg of legs) {
      const o = leg.odds;
      if (!o) return null;
      const decimal = o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o);
      product *= decimal;
    }
    return product;
  }

  function calculateParlayToWin(): number | null {
    const decimal = calculateParlayDecimalOdds();
    if (!decimal || !stake) return null;
    const stakeNum = Number(stake);
    if (!stakeNum || isNaN(stakeNum)) return null;
    return stakeNum * (decimal - 1);
  }

  function calculateParlayAmericanOdds(): number | null {
    const decimal = calculateParlayDecimalOdds();
    if (!decimal) return null;
    const profitPer1 = decimal - 1;
    if (profitPer1 >= 1) {
      return Math.round(profitPer1 * 100);
    } else {
      return Math.round(-100 / profitPer1);
    }
  }

  const parlayAmericanOdds = calculateParlayAmericanOdds();
  const parlayToWin = calculateParlayToWin();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex justify-center">
      <div className="w-full max-w-5xl p-6 mt-6">
        {/* PICKS BANNER */}
        <section className="mb-4">
          <button
            type="button"
            onClick={() => setShowPicksPanel((prev) => !prev)}
            className="w-full md:w-auto flex items-center justify-between md:justify-start gap-3 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-400/70 hover:bg-slate-800/80 transition text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Picks
              </span>
              <span className="text-slate-100 font-medium">
                {picksCount === 0
                  ? "No picks selected yet"
                  : `${picksCount} pick${picksCount === 1 ? "" : "s"} selected`}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {showPicksPanel ? "Hide" : "Show"}
            </span>
          </button>

          {showPicksPanel && (
            <div className="mt-3 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm space-y-3">
              {mode === "single" && (
                <>
                  {singleHasPick ? (
                    <>
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="font-semibold">
                            {team} {betType || "ML"}
                            {odds && (
                              <span className="text-emerald-300 ml-1">
                                ({Number(odds) > 0 ? `+${odds}` : odds})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {game || "Game not set"}
                          </div>
                        </div>
                        {stake && (
                          <div className="text-xs text-slate-300">
                            Stake: ${stake}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={submitSingleBet}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md text-sm"
                      >
                        {loading ? "Submitting..." : "Submit bet"}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Tap a selection below to choose your pick, then set stake
                      and submit.
                    </p>
                  )}
                </>
              )}

              {mode === "parlay" && (
                <>
                  {legs.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Tap selections below to build your parlay.
                    </p>
                  ) : (
                    <>
                      <ul className="space-y-2 max-h-48 overflow-auto pr-1">
                        {legs.map((leg, idx) => (
                          <li
                            key={idx}
                            className="flex justify-between items-center text-sm bg-slate-950 px-3 py-2 rounded-md border border-slate-700"
                          >
                            <div>
                              <div className="font-semibold">
                                {leg.team} {leg.betType}{" "}
                                {leg.odds > 0
                                  ? `(+${leg.odds})`
                                  : `(${leg.odds})`}
                              </div>
                              <div className="text-xs text-slate-400">
                                {leg.game}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setLegs((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                );
                                const keyToRemove = selectedOutcomeKeys[idx];
                                setSelectedOutcomeKeys((prev) =>
                                  prev.filter((k) => k !== keyToRemove)
                                );
                              }}
                              className="text-[11px] text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 space-y-2 text-xs text-slate-300">
                        {parlayAmericanOdds != null && (
                          <div>
                            Parlay odds:{" "}
                            <span className="text-emerald-300">
                              {parlayAmericanOdds > 0
                                ? `+${parlayAmericanOdds}`
                                : parlayAmericanOdds}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col md:flex-row items-stretch gap-3 mt-2">
                          <div className="flex-1">
                            <label className="block text-xs text-slate-300 mb-1">
                              Parlay stake ($)
                            </label>
                            <input
                              className="w-full rounded-md border border-slate-600 bg-slate-950 text-white px-3 py-2 text-sm"
                              placeholder="25"
                              value={stake}
                              onChange={(e) => setStake(e.target.value)}
                            />
                            {parlayToWin != null && (
                              <div className="mt-1 text-[11px] text-emerald-300">
                                To win: ${parlayToWin.toFixed(2)}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={legs.length < 2 || !stake || loading}
                            onClick={handleSubmitParlay}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading
                              ? "Submitting..."
                              : `Submit ${legs.length}-leg parlay`}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* MODE TOGGLE */}
        <section className="mb-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("single");
              setShowPicksPanel(false);
            }}
            className={[
              "px-3 py-1 rounded-full text-sm border",
              mode === "single"
                ? "bg-emerald-500 border-emerald-400 text-white"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700",
            ].join(" ")}
          >
            Single bet
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("parlay");
              setShowPicksPanel(true);
            }}
            className={[
              "px-3 py-1 rounded-full text-sm border",
              mode === "parlay"
                ? "bg-emerald-500 border-emerald-400 text-white"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700",
            ].join(" ")}
          >
            Parlay
          </button>
        </section>

        {/* SPORT PICKER */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Choose a sport</h2>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedSport(s.key)}
                className={[
                  "px-3 py-1 rounded-full text-sm border",
                  selectedSport === s.key
                    ? "bg-emerald-500 border-emerald-400 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* UPCOMING GAMES + ODDS */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">
            Upcoming games & moneyline odds
          </h2>

          {loadingGames && (
            <p className="text-slate-300 text-sm">Loading games...</p>
          )}

          {gamesError && (
            <p className="text-red-400 text-sm">Error: {gamesError}</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {games.map((g) => (
              <div
                key={g.id}
                className="bg-slate-800 rounded-lg p-3 border border-slate-700"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-semibold text-sm md:text-base">
                    {g.awayTeam} @ {g.homeTeam}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(g.commenceTime).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {g.outcomes.map((o) => {
                    const key = `${g.id}-${o.name}`;
                    const selected = selectedOutcomeKeys.includes(key);

                    return (
                      <button
                        key={o.name}
                        type="button"
                        onClick={() => selectBet(g, o)}
                        className={[
                          "flex-1 text-xs md:text-sm px-2 py-2 rounded-md text-center border transition",
                          selected
                            ? "bg-emerald-600 border-emerald-400 text-white"
                            : "bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-100",
                        ].join(" ")}
                      >
                        <div className="font-semibold truncate">{o.name}</div>
                        <div className="text-emerald-300 text-xs">
                          {o.price > 0 ? `+${o.price}` : o.price}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {!loadingGames && games.length === 0 && !gamesError && (
            <p className="text-slate-300 text-sm mt-2">
              No games available right now for this sport.
            </p>
          )}
        </section>

        {/* SINGLE BET FORM (still available for editing) */}
        {mode === "single" && (
          <section className="max-w-lg bg-slate-800 rounded-xl p-6 shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Create Bet</h1>

            <form onSubmit={handleSubmitSingle} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-200 mb-1">
                  Game
                </label>
                <input
                  className="w-full rounded-md border border-slate-600 bg-slate-900 text-white px-3 py-2"
                  placeholder="Team A vs Team B"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-200 mb-1">
                  Team
                </label>
                <input
                  className="w-full rounded-md border border-slate-600 bg-slate-900 text-white px-3 py-2"
                  placeholder="Team name"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-200 mb-1">
                  Bet type
                </label>
                <input
                  className="w-full rounded-md border border-slate-600 bg-slate-900 text-white px-3 py-2"
                  placeholder="ML, spread, total..."
                  value={betType}
                  onChange={(e) => setBetType(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-200 mb-1">
                    Odds
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-600 bg-slate-900 text-white px-3 py-2"
                    placeholder="-120 or 250"
                    value={odds}
                    onChange={(e) => setOdds(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-200 mb-1">
                    Stake ($)
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-600 bg-slate-900 text-white px-3 py-2"
                    placeholder="25"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition"
              >
                {loading ? "Saving bet..." : "Save Bet"}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------- Wrapper component with Suspense (required for useSearchParams) ----------

export default function NewBetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="text-sm text-slate-300">Loading bet builder…</div>
        </div>
      }
    >
      <NewBetPageInner />
    </Suspense>
  );
}
