# MVP tab on the home page

Add a fifth tab, **MVP**, placed between Ranking and Trophies, that brings the MVP vote from the signup pages onto the home page and adds season-wide MVP stats.

## What the user sees

Tab order becomes: Ranking · MVP · Trophies · Games · Schedule · News.

The tab holds two glass cards, matching the existing card-header style used by Schedule and Game History.

1. **MVP Votes** (top card)
   - Lists past fixtures whose ballot has kicked off, newest first, limited to the most recent 5.
   - Each fixture shows the familiar header line: uppercase date, then time · pitch, plus the open/closed status line with the pulsing green dot when voting is open and a static grey dot when closed.
   - Under each fixture, the exact same vote block used on the signup page: progress rail with "x of y voted", tap-a-name voting when the visitor is a signed-in player on that game's roster, the lock note when they are not, and the winner / tally list once the ballot closes.
   - Voting rules stay untouched: roster-only, secret until close, 3-day window, up to two joint winners, no award on a tie of three or more.
   - Empty state: "No MVP votes yet." in the standard muted empty-state style.

2. **MVP Leaders** (bottom card)
   - Season-aware ranking of MVP awards per player: avatar, name, awards count, and a bar relative to the leader — same row styling as the ranking table rows.
   - Small summary line above it: games with an MVP awarded · total votes cast · current leader.
   - Follows the season switcher: current season uses live data, an archived season uses the archived tables, exactly like the other tabs.

## Technical notes

- New `src/components/MvpTab.tsx` renders both cards; `src/pages/Index.tsx` gets the extra `TabsTrigger`/`TabsContent` and the grid changes from `grid-cols-5` to `grid-cols-6`.
- Fixture list: `games_schedule` filtered to `scheduled_at <= now()`, ordered descending, limit 5 (archived season: `archived_games_schedule` for that season).
- The vote block reuses `MvpVoteCard` and `useMvpVote` unchanged, one instance per fixture, so eligibility, polling and RLS behave identically to `/signup/:gameId`. Candidates are derived the same way as on the signup page: signups for that fixture, dropouts excluded, capped at pitch capacity (12 small / 14 big).
- Archived seasons are read-only: for those, render recorded winners and archived vote tallies instead of `MvpVoteCard`, mirroring the fallback already in `ScheduleDisplay`.
- MVP leaders come from the existing achievements data already loaded on the home page (`usePlayerAchievements` / `useArchivedAchievements`, field `mvp_awards`); total votes cast from `mvp_votes` (or `archived_mvp_votes`) counted for the listed season.
- All signup fetches go through `fetchAllPages`.
- No schema changes, no changes to voting logic or point awards.
