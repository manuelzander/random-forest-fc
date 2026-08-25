# Homepage Cards: Next Game and Season Insights

## Goal

Add a more interesting card row to the main homepage above the Ranking/Trophies/Games/Schedule tabs, in the same aurora-glass style as the season banner.

## What will change

- Replace the current simple `Total Players` / `Games Played` stat tiles with a richer responsive card grid.
- Add a `Next Game` card that highlights the next scheduled match with:
  - Date and time
  - Pitch size
  - Signup progress, e.g. `10 / 12`
- Add a few compact season insight cards, likely:
  - `Total Players`
  - `Games Played`
  - `MVP Race` using the existing achievement data
- Keep the design restrained: glass surfaces, small accent glows, icons, compact labels, and no oversized marketing-style blocks.

## Season behavior

- Current/live season: show actionable `Next Game` 
- Archived season view: keep the stats meaningful for the selected season and avoid live-only actions.
- If no next game exists, show a tidy empty state in the `Next Game` card rather than hiding the whole section.

## Technical details

- Create a focused homepage summary component, for example `HomepageStatsCards`, so `Index.tsx` stays readable.
- Use existing Supabase tables already used by the app:
  - `games_schedule` and `games_schedule_signups` for live next-game data
  - `archived_games_schedule` and `archived_games_schedule_signups` for archived schedule counts if needed
  - existing `players` / archived achievement data passed from the homepage for leader and MVP stats
- Use `fetchAllPages` when reading signup rows to avoid the Supabase 1000-row cap.
- Reuse design tokens and shared classes from `index.css`; add only small semantic helper classes if the cards need a reusable surface style.
- Preserve the existing tab layout and season banner behavior.

## Validation

- Check the homepage in the live season and archived season modes.
- Confirm mobile layout stacks cleanly and text does not overflow.
- Check build/runtime logs after implementation.