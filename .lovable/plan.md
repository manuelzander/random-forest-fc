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
- No new route or page — it's page state, so returning to the current season is one click.

## The same banner on the Admin panel

This architecture holds up, and reusing the banner in Admin is the cleaner design — one component, one hook, one source of truth for "which season am I looking at".

The same banner sits above the Admin tab bar and drives which season the season-scoped tabs show:

- **Games** — archived seasons show that season's results read-only (no edit, delete, or add).
- **Schedule** — archived seasons show past fixtures and their signups read-only (no create, no signup changes, no delete).
- **Debt** — archived seasons recalculate from that season's schedules and signups. Credit editing stays enabled, since credit is a single current balance rather than season data.
- **Players** and **News** are not season-scoped, so they always show live data. When a past season is selected those two tabs stay exactly as they are today; the banner's archived styling makes it clear the season selector doesn't apply to them.

Why read-only for archived data: archived rows are a historical record, and allowing edits there would let stats and debt for a closed season drift after the fact. Editing a past season stays a deliberate database operation rather than an everyday admin action.

## Debt time travel

Yes — a season dropdown on the Debt tab is simpler and non-destructive, so that's the approach.

- Credit stays exactly as it is on `profiles.credit` and `guests.credit` — carried over untouched. Nothing is written to anyone's balance.
- The Admin Debt tab gains a season dropdown at the top. Picking a season recalculates debt from that season's schedules and signups — live tables for the current season, archive tables for past ones — using the identical capacity and cost rules already in place.
- Last season's outstanding debt is never lost: it's one dropdown away, with the same per-player breakdown and CSV export.
- The new season's debt starts at zero simply because it has no games yet.
- Credit shown next to debt is always the person's current balance, so as people pay off old debt the historical view updates too.

## Safety

- Archiving and clearing run as one database migration: if any part fails, nothing changes.
- Row-count checks verify the archive holds every game, schedule, and signup before the live tables are cleared.
- CSV snapshots of the three tables are saved to your documents folder before the migration runs.
- No credit or profile row is modified by the migration at all.

## Technical details

Migration (single transaction):

1. `seasons` table: `id`, `name`, `started_on`, `ended_on`, `is_current`. Public read; admin write.
2. Archive tables mirroring the live schemas plus `season_id`: `archived_games`, `archived_games_schedule`, `archived_games_schedule_signups`. Each gets `GRANT SELECT` to `anon`/`authenticated`, `GRANT ALL` to `service_role`, RLS enabled, a public SELECT policy, and an admin-only ALL policy via `has_role`.
3. Create the season row ("2025/26", 2025-09-10 to 2026-08-01), copy all rows with that `season_id`, assert counts match (72 / 76 / 1009).
4. `DELETE` from the three live tables (signups first for FK order).
5. Insert the new current season row ("2026/27", `is_current = true`).

New DB function `get_archived_player_achievements(p_season_id uuid)` — same result shape as `get_player_achievements()` so Ranking and Trophies work unchanged, but aggregating `archived_games`.

Frontend:

- `src/components/SeasonBanner.tsx` — banner, subtle affordance on the season number, inline expanding picker, archived-state styling. Colors via semantic tokens (new muted archive accent in `index.css`), no hardcoded color classes.
- `src/hooks/useSeasons.tsx` — season list + current season.
- Season selection state lives in `Index.tsx` and is passed down.
- `src/hooks/useArchivedPlayerAchievements.tsx` — calls the new RPC when a past season is selected; `Index.tsx` feeds either live or archived players into `PlayerTable` and `AchievementsTable` unchanged.
- `GamesList` and `ScheduleDisplay` gain an optional `seasonId` prop; when set they query the archived tables and render read-only (no signup or admin actions).
- `AdminGameManagement` and `AdminScheduleManagement` gain the same optional `seasonId`; when a past season is active they render their tables with mutation controls hidden and read from the archive tables.
- `Admin.tsx` renders `SeasonBanner` above its `TabsList` and passes the selected season into the Games, Schedule, and Debt tabs only.
- The season selection hook is shared: `useSeasons` plus a small `SeasonProvider` so `Index.tsx` and `Admin.tsx` use the same logic without duplicating state handling.
- Stat cards read counts from whichever season is active.
- `AdminDebtManagement` gains a season `Select`. Its fetch reads `games_schedule` / `games_schedule_signups` for the current season and `archived_games_schedule` / `archived_games_schedule_signups` (filtered by `season_id`) for past ones. The aggregation currently inline in `fetchDebtData` is extracted into one shared helper so both paths use identical rules; `debtCalculation.ts` stays as-is.
