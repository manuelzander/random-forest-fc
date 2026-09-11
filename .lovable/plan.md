# Homepage: MVP voting widget, compact Last Game

## Changes

1. When one or more MVP votes are open (a game kicked off less than 72h ago and its ballot is not closed):
   - The Last game card shrinks to the same size as the Games Played / MVP Race tiles: date, scoreline, no meta line, no footer link.
   - A new "MVP Vote" tile appears next to it, in the same style as the other small tiles: crown icon, count of open ballots, the date/time of the earliest open one, and a link that opens that game's signup page (where the ballot lives). With more than one open ballot, the link points at the earliest and the subtext reads e.g. "2 ballots open".
   - Layout stays one row on desktop: Next game (wide) + Last game + MVP Vote + Games Played + MVP Race, wrapping cleanly on mobile.

2. When no MVP vote is open, the homepage looks exactly as today: full-size Last game card with meta line, scoreline and View Games link, and no MVP Vote tile.

3. Archived seasons never show the MVP Vote tile (no live ballots), so they keep today's layout.

## Technical details

- Edit `src/components/HomepageStatsCards.tsx` only.
- Query open ballots in the same effect: `games_schedule` rows with `scheduled_at` between now-72h and now where `mvp_votes_finalized_at is null`, ordered ascending. Skipped when `archiveSeasonId` is set.
- `hasOpenVotes` drives both the grid spans (`lg:col-span-2` vs `lg:col-span-1`) and a compact variant of the Last game body.
- Grid becomes `lg:grid-cols-7` when open votes exist so all five tiles fit one row; otherwise it stays `lg:grid-cols-6`.
- MVP Vote tile reuses `stat-tile`, `section-kicker`, `card-action-link` and the pulsing primary dot pattern already used for the live states; no new tokens, no hardcoded colours.
- Link uses `react-router-dom` `Link` to `/signup/<game_schedule_id>`.

## Validation

- Check homepage with an open ballot and with none, in live and archived season modes, at desktop and mobile widths; confirm the build log is clean.
