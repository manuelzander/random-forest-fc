# Homepage Cards: Last Game replaces Total Players

## Changes

1. Next Game card
   - Never show a year in the date or meta line, in any season (live or archived).
   - In an archived season, still render the card, with an empty state: "No more fixtures planned".

2. New Last Game card
   - Replaces the Total Players card.
   - Shows the most recent recorded result: date (no year), scoreline (e.g. 5 - 3), and MVP name if set.
   - Works in both live and archived seasons (archived reads that season's archived results).
   - Empty state: "No results recorded yet".

3. Layout
   - Unchanged structure in both live and archived views: Next Game (wide) + Last Game + Games Played + MVP Race.
   - Mobile stacks cleanly as today.

## Technical details

- Edit `src/components/HomepageStatsCards.tsx` only; the now-unused `totalPlayers` prop is dropped from the component and its call site in `Index.tsx`.
- Date formats: `EEE, MMM d` headline and `h:mm a` time only — no `yyyy` anywhere in these cards.
- Next game: live reads upcoming `games_schedule`; archived shows the empty state without fetching a fixture.
- Last game: `games` ordered by `created_at desc limit 1` for live; `archived_games` filtered by `season_id` for archived.
- MVP name resolved from the already-passed `players` list via `mvp_player`.
- Reuse existing tokens: `glass-panel`, `stat-tile`, `section-kicker`; no hardcoded colors.

## Validation

- Check homepage in live and archived season modes, plus mobile widths.
- Confirm build log is clean.
