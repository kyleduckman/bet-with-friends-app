"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type BetRow = {
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

type ParlayRow = {
  id: string;
  user_email: string | null;
  user_username: string | null;
  stake: number | null;
  combined_odds: number | null;
  created_at: string;
};

type ParlayLegRow = {
  id: string;
  parlay_id: string;
  sport: string | null;
  game: string | null;
  team: string;
  bet_type: string | null;
  odds: number;
};

type FeedItem =
  | {
      kind: "single";
      id: string;
      created_at: string;
      user_username: string | null;
      game: string | null;
      team: string;
      bet_type: string | null;
      odds: number | null;
    }
  | {
      kind: "parlay";
      id: string;
      created_at: string;
      user_username: string | null;
      combined_odds: number | null;
      legs: {
        game: string | null;
        team: string;
        bet_type: string | null;
        odds: number;
      }[];
    };

type ReactionRow = {
  id: string;
  user_id: string;
  user_username: string | null;
  item_type: "single" | "parlay";
  item_id: string;
  reaction_type: "up" | "down" | "tail";
  created_at: string;
};

type CommentRow = {
  id: string;
  user_id: string;
  user_username: string | null;
  item_type: "single" | "parlay";
  item_id: string;
  content: string;
  created_at: string;
};

type Reactions = {
  up: boolean;
  down: boolean;
  tailed: boolean;
};

type ReactionSummary = {
  up: { count: number; users: string[] };
  down: { count: number; users: string[] };
  tailed: { count: number; users: string[] };
};

export default function GlobalFeedPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [currentIsAdmin, setCurrentIsAdmin] = useState(false);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Reactions & comments from DB
  const [userReactionsByItem, setUserReactionsByItem] = useState<
    Record<string, Reactions>
  >({});
  const [reactionSummaryByItem, setReactionSummaryByItem] = useState<
    Record<string, ReactionSummary>
  >({});
  const [commentsByItem, setCommentsByItem] = useState<
    Record<string, CommentRow[]>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    async function loadFeed() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/auth/login");
        return;
      }

      const user = userData.user;
      setCurrentUserId(user.id);
      const username =
        (user.user_metadata && (user.user_metadata as any).username) || null;
      setCurrentUsername(username);

      const role =
        (user.user_metadata && (user.user_metadata as any).role) || null;
      setCurrentIsAdmin(role === "admin");

      // 1. singles
      const { data: betData, error: betError } = await supabase
        .from("bets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      // 2. parlays
      const { data: parlayData, error: parlayError } = await supabase
        .from("parlays")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // 3. legs
      const { data: legData, error: legError } = await supabase
        .from("parlay_legs")
        .select("*");

      // 4. reactions
      const { data: reactionData, error: reactionError } = await supabase
        .from("feed_reactions")
        .select("*");

      // 5. comments
      const { data: commentData, error: commentError } = await supabase
        .from("feed_comments")
        .select("*")
        .order("created_at", { ascending: true });

      if (betError) console.error(betError);
      if (parlayError) console.error(parlayError);
      if (legError) console.error(legError);
      if (reactionError) console.error(reactionError);
      if (commentError) console.error(commentError);

      const betRows = (betData || []) as BetRow[];
      const parlayRows = (parlayData || []) as ParlayRow[];
      const legRows = (legData || []) as ParlayLegRow[];
      const reactionRows = (reactionData || []) as ReactionRow[];
      const commentRows = (commentData || []) as CommentRow[];

      // group legs by parlay
      const legsByParlay: Record<string, ParlayLegRow[]> = {};
      for (const leg of legRows) {
        if (!legsByParlay[leg.parlay_id]) {
          legsByParlay[leg.parlay_id] = [];
        }
        legsByParlay[leg.parlay_id].push(leg);
      }

      const singleItems: FeedItem[] = betRows.map((b) => ({
        kind: "single",
        id: b.id,
        created_at: b.created_at,
        user_username: b.user_username,
        game: b.game,
        team: b.team,
        bet_type: b.bet_type,
        odds: b.odds,
      }));

      const parlayItems: FeedItem[] = parlayRows.map((p) => ({
        kind: "parlay",
        id: p.id,
        created_at: p.created_at,
        user_username: p.user_username,
        combined_odds: p.combined_odds,
        legs: (legsByParlay[p.id] || []).map((leg) => ({
          game: leg.game,
          team: leg.team,
          bet_type: leg.bet_type,
          odds: leg.odds,
        })),
      }));

      const merged = [...singleItems, ...parlayItems].sort((a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setItems(merged);

      // build reactions state
      const userReactions: Record<string, Reactions> = {};
      const summaries: Record<string, ReactionSummary> = {};

      function initSummary(key: string): ReactionSummary {
        return (
          summaries[key] || {
            up: { count: 0, users: [] },
            down: { count: 0, users: [] },
            tailed: { count: 0, users: [] },
          }
        );
      }

      for (const r of reactionRows) {
        const key = `${r.item_type}-${r.item_id}`;
        const summary = initSummary(key);

        const usernameLabel = r.user_username || "Anon";

        if (r.reaction_type === "up") {
          summary.up.count += 1;
          if (!summary.up.users.includes(usernameLabel)) {
            summary.up.users.push(usernameLabel);
          }
        } else if (r.reaction_type === "down") {
          summary.down.count += 1;
          if (!summary.down.users.includes(usernameLabel)) {
            summary.down.users.push(usernameLabel);
          }
        } else if (r.reaction_type === "tail") {
          summary.tailed.count += 1;
          if (!summary.tailed.users.includes(usernameLabel)) {
            summary.tailed.users.push(usernameLabel);
          }
        }

        summaries[key] = summary;

        if (r.user_id === user.id) {
          const current = userReactions[key] || {
            up: false,
            down: false,
            tailed: false,
          };
          if (r.reaction_type === "up") current.up = true;
          if (r.reaction_type === "down") current.down = true;
          if (r.reaction_type === "tail") current.tailed = true;
          userReactions[key] = current;
        }
      }

      setReactionSummaryByItem(summaries);
      setUserReactionsByItem(userReactions);

      // build comments state
      const commentsMap: Record<string, CommentRow[]> = {};
      for (const c of commentRows) {
        const key = `${c.item_type}-${c.item_id}`;
        if (!commentsMap[key]) commentsMap[key] = [];
        commentsMap[key].push(c);
      }
      setCommentsByItem(commentsMap);

      setLoading(false);
    }

    loadFeed();
  }, [router]);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getItemKey(item: FeedItem): string {
    return `${item.kind}-${item.id}`;
  }

  async function handleToggleReaction(
    item: FeedItem,
    type: "up" | "down" | "tailed"
  ) {
    if (!currentUserId) {
      alert("You must be logged in to react.");
      return;
    }

    const key = getItemKey(item);
    const current = userReactionsByItem[key] || {
      up: false,
      down: false,
      tailed: false,
    };

    // figure out new state
    let next: Reactions = { ...current };
    if (type === "up") {
      next.up = !current.up;
      if (!current.up) next.down = false; // mutually exclusive with down
    } else if (type === "down") {
      next.down = !current.down;
      if (!current.down) next.up = false;
    } else if (type === "tailed") {
      next.tailed = !current.tailed;
    }

    // optimistic UI update
    setUserReactionsByItem((prev) => ({ ...prev, [key]: next }));

    // update summary optimistically
    setReactionSummaryByItem((prev) => {
      const existing =
        prev[key] || {
          up: { count: 0, users: [] },
          down: { count: 0, users: [] },
          tailed: { count: 0, users: [] },
        };
      const usernameLabel = currentUsername || "You";

      function adjust(
        entry: { count: number; users: string[] },
        wasOn: boolean,
        nowOn: boolean
      ) {
        if (wasOn === nowOn) return entry;
        const users = [...entry.users];
        if (nowOn) {
          if (!users.includes(usernameLabel)) users.push(usernameLabel);
          return { count: entry.count + 1, users };
        } else {
          const idx = users.indexOf(usernameLabel);
          if (idx >= 0) users.splice(idx, 1);
          return { count: Math.max(0, entry.count - 1), users };
        }
      }

      const updated: ReactionSummary = {
        up: adjust(existing.up, current.up, next.up),
        down: adjust(existing.down, current.down, next.down),
        tailed: adjust(existing.tailed, current.tailed, next.tailed),
      };
      return { ...prev, [key]: updated };
    });

    const item_type = item.kind;
    const item_id = item.id;

    // sync with DB
    try {
      // turning OFF
      if (
        (type === "up" && !next.up) ||
        (type === "down" && !next.down) ||
        (type === "tailed" && !next.tailed)
      ) {
        await supabase
          .from("feed_reactions")
          .delete()
          .match({
            user_id: currentUserId,
            item_type,
            item_id,
            reaction_type: type === "tailed" ? "tail" : type,
          });
      } else {
        // turning ON
        await supabase.from("feed_reactions").insert({
          user_id: currentUserId,
          user_username: currentUsername,
          item_type,
          item_id,
          reaction_type: type === "tailed" ? "tail" : type,
        });
      }
    } catch (err) {
      console.error(err);
      // could refetch if you want to be fancy
    }
  }

  async function handleSubmitComment(item: FeedItem) {
    if (!currentUserId) {
      alert("You must be logged in to comment.");
      return;
    }

    const key = getItemKey(item);
    const draft = commentDrafts[key]?.trim();
    if (!draft) return;

    const item_type = item.kind;
    const item_id = item.id;

    // optimistic UI
    const fakeComment: CommentRow = {
      id: `local-${Date.now()}`,
      user_id: currentUserId,
      user_username: currentUsername,
      item_type,
      item_id,
      content: draft,
      created_at: new Date().toISOString(),
    };

    setCommentsByItem((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), fakeComment],
    }));
    setCommentDrafts((prev) => ({ ...prev, [key]: "" }));

    try {
      const { data, error } = await supabase
        .from("feed_comments")
        .insert({
          user_id: currentUserId,
          user_username: currentUsername,
          item_type,
          item_id,
          content: draft,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        return;
      }

      // replace fake comment with real one
      if (data) {
        setCommentsByItem((prev) => {
          const list = prev[key] || [];
          const withoutFake = list.filter((c) => !c.id.startsWith("local-"));
          return { ...prev, [key]: [...withoutFake, data as CommentRow] };
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteComment(item: FeedItem, comment: CommentRow) {
    if (!currentIsAdmin) return;

    const key = getItemKey(item);

    // optimistic remove
    setCommentsByItem((prev) => {
      const list = prev[key] || [];
      return { ...prev, [key]: list.filter((c) => c.id !== comment.id) };
    });

    try {
      await supabase
        .from("feed_comments")
        .delete()
        .eq("id", comment.id);
    } catch (err) {
      console.error(err);
      // you could refetch comments here if you want to be strict
    }
  }

  function renderReactionsAndComments(item: FeedItem) {
    const key = getItemKey(item);
    const reactions =
      userReactionsByItem[key] || {
        up: false,
        down: false,
        tailed: false,
      };
    const summary =
      reactionSummaryByItem[key] ||
      ({
        up: { count: 0, users: [] },
        down: { count: 0, users: [] },
        tailed: { count: 0, users: [] },
      } as ReactionSummary);
    const comments = commentsByItem[key] || [];
    const draft = commentDrafts[key] || "";

    const renderNames = (names: string[], count: number) => {
      if (count === 0) return null;
      const shown = names.slice(0, 3);
      const others = count - shown.length;
      return (
        <>
          {shown.join(", ")}
          {others > 0 && ` +${others} more`}
        </>
      );
    };

    return (
      <div className="border-t border-slate-700 mt-3 pt-3 space-y-2">
        {/* Reactions row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleToggleReaction(item, "up")}
            className={[
              "px-2 py-1 rounded-full border flex items-center gap-1",
              reactions.up
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800",
            ].join(" ")}
          >
            <span>👍</span>
            <span>Like</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleReaction(item, "down")}
            className={[
              "px-2 py-1 rounded-full border flex items-center gap-1",
              reactions.down
                ? "bg-red-500/20 border-red-400 text-red-200"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800",
            ].join(" ")}
          >
            <span>👎</span>
            <span>Fade</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleReaction(item, "tailed")}
            className={[
              "px-2 py-1 rounded-full border flex items-center gap-1",
              reactions.tailed
                ? "bg-indigo-500/20 border-indigo-400 text-indigo-200"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800",
            ].join(" ")}
          >
            <span>🧵</span>
            <span>{reactions.tailed ? "Tailed" : "Tail"}</span>
          </button>
        </div>

        {/* Reaction summary */}
        <div className="text-[11px] text-slate-400 flex flex-wrap gap-3">
          {summary.up.count > 0 && (
            <span>
              👍 {summary.up.count} · {renderNames(summary.up.users, summary.up.count)}
            </span>
          )}
          {summary.down.count > 0 && (
            <span>
              👎 {summary.down.count} ·{" "}
              {renderNames(summary.down.users, summary.down.count)}
            </span>
          )}
          {summary.tailed.count > 0 && (
            <span>
              🧵 {summary.tailed.count} ·{" "}
              {renderNames(summary.tailed.users, summary.tailed.count)}
            </span>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-1">
          {comments.length > 0 && (
            <ul className="space-y-1 max-h-32 overflow-auto pr-1">
              {comments.map((c) => {
                const isAdminComment =
                  currentIsAdmin && c.user_username === currentUsername;
                return (
                  <li
                    key={c.id}
                    className="text-[11px] bg-slate-900/80 border border-slate-700 rounded-md px-2 py-1 text-slate-200"
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <span className="font-semibold text-emerald-200">
                          {c.user_username || "Anon"}
                        </span>
                        {isAdminComment && (
                          <span className="ml-1 text-amber-300">[Admin]</span>
                        )}
                        <span className="text-slate-500 ml-1">
                          · {formatTime(c.created_at)}
                        </span>
                      </div>
                      {currentIsAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(item, c)}
                          className="text-[10px] text-red-300 hover:text-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="mt-0.5">{c.content}</div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-2 mt-1">
            <input
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 text-[11px] text-white px-2 py-1"
              placeholder="Add a comment..."
              value={draft}
              onChange={(e) =>
                setCommentDrafts((prev) => ({
                  ...prev,
                  [key]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmitComment(item);
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleSubmitComment(item)}
              className="text-[11px] px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-50 border border-slate-600"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-200">Loading feed...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Global Bet Feed</h1>
        <button
          onClick={() => router.push("/bets/new")}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold"
        >
          + Place a bet
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-slate-300">
          No bets have been logged yet. Be the first to fire 😈
        </p>
      )}

      <div className="space-y-4">
        {items.map((item) => {
          const displayName = item.user_username || "Anonymous";
          const isAdminPoster =
            currentIsAdmin && item.user_username === currentUsername;

          if (item.kind === "single") {
            return (
              <div
                key={getItemKey(item)}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm">
                    <span className="font-semibold">{displayName}</span>
                    {isAdminPoster && (
                      <span className="ml-1 text-amber-300 text-xs">
                        [Admin]
                      </span>
                    )}{" "}
                    is riding{" "}
                    <span className="font-semibold">
                      {item.team} {item.bet_type}
                    </span>
                    {item.odds !== null && (
                      <span className="ml-1 text-emerald-300">
                        ({item.odds > 0 ? `+${item.odds}` : item.odds})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-600">
                    Single
                  </div>
                </div>

                {item.game && (
                  <div className="text-sm text-slate-300 mb-1">
                    Game: {item.game}
                  </div>
                )}

                <div className="flex justify-end items-center text-xs text-slate-400 mt-1">
                  {formatTime(item.created_at)}
                </div>

                {renderReactionsAndComments(item)}
              </div>
            );
          }

          // parlay card
          const legs = item.legs;
          const legCount = legs.length;

          return (
            <div
              key={getItemKey(item)}
              className="bg-slate-800 rounded-lg p-4 border border-indigo-500/50 shadow-md shadow-indigo-900/40"
            >
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="text-sm">
                  <span className="font-semibold">{displayName}</span>
                  {isAdminPoster && (
                    <span className="ml-1 text-amber-300 text-xs">
                      [Admin]
                    </span>
                  )}{" "}
                  is riding a{" "}
                  <span className="font-semibold">
                    {legCount}-leg parlay
                  </span>
                  {item.combined_odds !== null && (
                    <span className="ml-1 text-indigo-300">
                      ({item.combined_odds > 0
                        ? `+${item.combined_odds}`
                        : item.combined_odds}
                      )
                    </span>
                  )}
                </div>
                <div className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-400/50">
                  Parlay
                </div>
              </div>

              <div className="space-y-1 mb-2">
                {legs.map((leg, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-xs bg-slate-900/70 px-3 py-2 rounded-md border border-slate-700"
                  >
                    <div>
                      <div className="font-semibold">
                        {leg.team} {leg.bet_type}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {leg.game}
                      </div>
                    </div>
                    <div className="text-emerald-300 text-xs self-center">
                      {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end items-center text-xs text-slate-400 mt-1">
                {formatTime(item.created_at)}
              </div>

              {renderReactionsAndComments(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
