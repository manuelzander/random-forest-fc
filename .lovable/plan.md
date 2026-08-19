# Season Archive & Time Travel

End the 2025/26 season (72 games, 76 scheduled games, 1009 signups) by moving it into archive tables inside the same database, then clear the live tables so the new season starts empty. Players, guests, and credit balances carry over. The homepage gains a season banner that quietly lets you time-travel into past seasons.

## What happens

- A new "Seasons" record stores the season name and its date range.
- Every played game, scheduled game, and signup from this season is copied into archive tables, tagged with the season.
- The live game, schedule, and signup tables are emptied — the app looks like day one of a new season.
- Players, guests, avatars, claims, and profiles are untouched.
- News posts stay as they are (not season-scoped).

## Season banner & time travel

A slim banner sits directly above the "Total Players / Games Played" cards on the homepage:

```text
+------------------------------------------------+
|  SEASON  2026/27   ·  Current                  |
+------------------------------------------------+
```

- The season number is the banner's focal point — slightly larger, tabular numerals, with a very subtle hover treatment (faint underline and a small chevron that fades in) so it reads as clickable on second glance, not as an obvious button.
- Clicking the season number expands a compact season picker inline (smooth height/fade transition), listing the current season plus each archived season.
- Choosing a past season puts the whole homepage into time-travel mode:
  - Ranking, Trophies, Games, and Schedule tabs all render that season's archived data.
  - The two stat cards show that season's player count and games played.
  - The banner shifts to a muted, historical treatment, the label reads e.g. "2025/26 · Archived", and a clear "Back to current season" action appears.
  - The News tab stays on current news (news isn't season-scoped).
- No new route or page — it's homepage state, so returning to the current season is one click.

## Credit & debt carry-over

Credit is stored on `profiles.credit` and `guests.credit`, so it survives the archive automatically.

Debt is calculated live from `games_schedule` + `games_schedule_signups` every time the Debt admin page loads. Clearing those tables would silently erase last season's outstanding debt, so the migration first folds each person's final net balance (credit minus debt) into their credit value:

- People who owed money end up with a reduced — possibly negative — credit balance.
- People in credit keep their surplus.
- The new season starts with no historical debt while balances are preserved.
- The pre-archive credit values and calculated debt are exported to CSV first, so the step is reversible.

## Safety

- Archiving, balance folding, and clearing run as one database migration: if any part fails, nothing changes.
- Row-count checks verify the archive holds every game, schedule, and signup before the live tables are cleared.
- CSV snapshots of the three tables plus pre-archive credit values are saved to your documents folder before the migration runs.

## Technical details

Migration (single transaction):

1. `seasons` table: `id`, `name`, `started_on`, `ended_on`, `is_current`. Public read; admin write.
2. Archive tables mirroring the live schemas plus `season_id`: `archived_games`, `archived_games_schedule`, `archived_games_schedule_signups`. Each gets `GRANT SELECT` to `anon`/`authenticated`, `GRANT ALL` to `service_role`, RLS enabled, a public SELECT policy, and an admin-only ALL policy via `has_role`.
3. Create the season row ("2025/26", 2025-09-10 to 2026-08-01), copy all rows with that `season_id`, assert counts match (72 / 76 / 1009).
4. Fold net balance into `profiles.credit` / `guests.credit`.
5. `DELETE` from the three live tables (signups first for FK order).
6. Insert the new current season row ("2026/27", `is_current = true`).

New DB function `get_archived_player_achievements(p_season_id uuid)` — same result shape as `get_player_achievements()` so Ranking and Trophies work unchanged, but aggregating `archived_games`.

Frontend:

- `src/components/SeasonBanner.tsx` — banner, subtle affordance on the season number, inline expanding picker, archived-state styling. Colors via semantic tokens (new muted archive accent in `index.css`), no hardcoded color classes.
- `src/hooks/useSeasons.tsx` — season list + current season.
- Season selection state lives in `Index.tsx` and is passed down.
- `src/hooks/useArchivedPlayerAchievements.tsx` — calls the new RPC when a past season is selected; `Index.tsx` feeds either live or archived players into `PlayerTable` and `AchievementsTable` unchanged.
- `GamesList` and `ScheduleDisplay` gain an optional `seasonId` prop; when set they query the archived tables and render read-only (no signup or admin actions).
- Stat cards read counts from whichever season is active.
- `debtCalculation.ts` and `AdminDebtManagement` are untouched — they stay on live tables, which now start empty.
