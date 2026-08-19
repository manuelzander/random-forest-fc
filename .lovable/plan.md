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

## Credit & debt carry-over

Credit is stored directly on `profiles.credit` and `guests.credit`, so it survives the archive automatically.

Debt is calculated from `games_schedule` + `games_schedule_signups` every time the admin opens the Debt page. When we clear those live tables, the new-season debt calculation will naturally start at zero.

To make sure last season's debt is **not** forgotten, we will snapshot each player's final net balance (credit minus debt) back into their credit balance as part of the archive migration. This means:

- Players who owed money see their credit balance reduced by that amount (it can go negative).
- Players who were in credit keep their surplus.
- The new season begins with empty schedules and no historical debt, while the carried-forward balance is preserved in `credit`.
- This is reversible at the CSV level: if a mistake is made, the pre-archive credit values and the calculated debt are exported in a CSV fallback.

## Safety

- Archiving and clearing run as one database migration: if any part fails, nothing changes.
- A row-count check is included so the archive is verified to hold every game and signup before the live tables are cleared.
- A CSV snapshot of the three tables is saved to your documents folder before the migration runs, as an extra fallback.
- The credit adjustment step is calculated from the exact same signup data that is being archived, so the numbers are consistent.

## Technical details

Migration (single transaction):

1. `seasons` table: `id`, `name`, `started_on`, `ended_on`, `is_current`. Public read; admin write.
2. Archive tables mirroring the live schemas plus `season_id`:
   - `archived_games` (all `games` columns)
   - `archived_games_schedule` (all `games_schedule` columns)
   - `archived_games_schedule_signups` (all `games_schedule_signups` columns)
   Each gets `GRANT SELECT` to `anon`/`authenticated`, `GRANT ALL` to `service_role`, RLS enabled, public SELECT policy, admin-only ALL policy via `has_role`.
3. Create the season row ("2025/26", 2025-09-10 → 2026-08-01), copy all rows with that `season_id`, assert counts match (72 / 76 / 1009).
4. Calculate each player/guest's net balance from the archived season and update `profiles.credit` / `guests.credit` to that net balance (credit minus debt).
5. `DELETE` from the three live tables (signups first for FK order).

New DB function `get_archived_player_stats(p_season_id uuid)` — same aggregation shape as `get_player_stats()` but reading `archived_games`, joined to `players` so names/avatars resolve.

Frontend:

- `src/pages/Seasons.tsx` + route in `App.tsx`, plus a nav link on `Index.tsx`.
- `src/hooks/useSeasons.tsx` (season list) and `useArchivedPlayerStats(seasonId)` calling the new RPC.
- Reuse `PlayerTable` for standings; extract the game-card markup from `GamesList` into a shared presentational component so archived games render identically (keeps it DRY, no duplicate layout).
- Debt calculation is untouched: `debtCalculation.ts` and `AdminDebtManagement` operate on live schedules/signups, which are now empty, so all live debts start at zero while the carried-forward net balance is preserved in `credit`.
