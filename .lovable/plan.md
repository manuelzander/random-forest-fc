# Homepage Cards: Last Game replaces Total Players

## Changes

1. Next Game card
   - Remove the year (e.g. "2025") from the archived variant of the meta line.
   - In an archived season, do not render the Next Game card at all.

2. New Last Game card
   - Replaces the Total Players card.
   - Shows the most recent recorded result: date, scoreline (e.g. 5 - 3), and MVP name if set.
   - Works in both live and archived seasons (archived reads the season's archived results).
   - Empty state: "No results recorded yet".

3. Layout
   - Live season: Next Game (wide) + Last Game + Games Played + MVP Race.
   - Archived season: Last Game (wide) + Games Played + MVP Race, no Next Game.
   - Grid column spans adjust so both cases fill the row cleanly on desktop and stack on mobile.

## Technical details

- Edit `src/components/HomepageStatsCards.tsx` only; `Index.tsx` keeps passing the same props (the now-unused `totalPlayers` prop is removed from the component and its call site).
- Last game source: `games` ordered by `created_at desc limit 1` for the live season; `archived_games` filtered by `season_id` for archived.
- MVP name resolved from the already-passed `players` list by `mvp_player` id.
- Skip the next-game fetch entirely when `archiveSeasonId` is set.
- Reuse existing tokens: `glass-panel`, `stat-tile`, `section-kicker`, no hardcoded colors.

## Validation

- Check homepage in live and archived season modes, plus mobile widths.
- Confirm build log is clean.
