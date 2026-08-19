# Season Archive & Fresh Start

End the 2025/26 season (72 games, 76 scheduled games, 1009 signups) by moving it into archive tables inside the same database, then clear the live tables so the new season starts empty. Players, guests, and all credit balances stay exactly as they are.

## What happens

- A new "Seasons" record stores the season name and its date range.
- Every played game, scheduled game, and signup from this season is copied into archive tables, tagged with the season.
- The live game, schedule, and signup tables are emptied — the app looks like day one of a new season.
- Players, guests, avatars, claims, profiles, and all credit/debt balances are untouched and carry over.
- News posts stay as they are (not season-scoped).

## Public past-season view

- A new "Seasons" page (linked from the home page) lets anyone pick a finished season and see:
  - Final standings for that season (points, games, W/D/L, MVPs, goal difference)
  - That season's game history, with teams, scores, captains and MVPs
- The current-season standings and game history on the home page work exactly as today, just starting from zero.

## Safety

- Archiving and clearing run as one database migration: if any part fails, nothing changes.
- A row-count check is included so the archive is verified to hold every game and signup before the live tables are cleared.
- A CSV snapshot of the three tables is saved to your documents folder before the migration runs, as an extra fallback.

## Technical details

Migration (single transaction):

1. `seasons` table: `id`, `name`, `started_on`, `ended_on`, `is_current`. Public read; admin write.
2. Archive tables mirroring the live schemas plus `season_id`:
   - `archived_games` (all `games` columns)
   - `archived_games_schedule` (all `games_schedule` columns)
   - `archived_games_schedule_signups` (all `games_schedule_signups` columns)
   Each gets `GRANT SELECT` to `anon`/`authenticated`, `GRANT ALL` to `service_role`, RLS enabled, public SELECT policy, admin-only ALL policy via `has_role`.
3. Insert the season row ("2025/26", 2025-09-10 → 2026-08-01), copy all rows with that `season_id`, assert counts match (72 / 76 / 1009), then `DELETE` from the three live tables (signups first for FK order).

New DB function `get_archived_player_stats(p_season_id uuid)` — same aggregation shape as `get_player_stats()` but reading `archived_games`, joined to `players` so names/avatars resolve.

Frontend:

- `src/pages/Seasons.tsx` + route in `App.tsx`, plus a nav link on `Index.tsx`.
- `src/hooks/useSeasons.tsx` (season list) and `useArchivedPlayerStats(seasonId)` calling the new RPC.
- Reuse `PlayerTable` for standings; extract the game-card markup from `GamesList` into a shared presentational component so archived games render identically (keeps it DRY, no duplicate layout).
- Debt calculation is untouched: `debtCalculation.ts` operates on live schedules/signups, which are now empty, so all debts start at zero while credits remain.
