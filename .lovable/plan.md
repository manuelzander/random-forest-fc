# Link the result to a fixture explicitly, with MVP vote suggestions

## What the data shows right now

Three past fixtures have no result entered yet:

- Tue Sep 1, 18:15 (big pitch) — voting closed, winner already decided, 6 votes
- Tue Sep 8, 18:15 (big pitch) — 1 vote, voting still open
- Tue Sep 8, 20:00 (small pitch) — 1 vote, voting still open

So the automatic matching is currently wrong for the Sep 1 game in two ways:

1. It only looks back 7 days, and the Sep 1 game has just fallen outside that window. Entering a result now would attach it to a Sep 8 game instead.
2. Two games happen on the same day, and it silently picks the earlier one — so a result for the later game lands on the wrong fixture.

## What we change

**1. The admin picks the fixture (main fix).**
At the top of the result form, a "Game" selector lists every past fixture with no result yet, newest first, shown as date + time + pitch (e.g. "Tue 1 Sep · 18:15 · Big pitch"). It defaults to the most recent unmatched fixture. The existing automatic matching stays as the fallback when nothing is chosen, so old behaviour is unchanged.

**2. MVP suggestions follow the chosen fixture.**
Once a fixture is selected:

- A small line above the MVP field shows the vote picture: "Player vote: Tom 5 · Ben 3 · Alex 1", names clickable to select as MVP.
- Vote counts also appear next to names in the MVP dropdown.
- If voting closed with a clear outcome (one winner, or two tied sharing it), those names are pre-selected and still editable.
- Three or more tied: nothing pre-selected, with a short note that a three-way tie awards no MVP.
- Voting still open: counts shown as a live snapshot with a note.
- No votes: the field behaves exactly as today.

**3. Optional convenience:** a "fill from signups" hint listing the players who were on that fixture's roster, so lineups are quicker to enter. Can be dropped if it feels like clutter.

Whatever is in the MVP field on save is what counts — the suggestions never override the admin.

## Technical notes

- `GameInput.tsx` gains a `gameScheduleId` state and selector; `AdminGameManagement.tsx` (and the homepage submit path in `Index.tsx`) pass it through to the `games` insert as `game_schedule_id`.
- The `link_game_to_schedule` trigger already skips its lookup when `game_schedule_id` is provided, so no migration is required. Its 7-day window remains as fallback only; optionally widen it to 30 days in a follow-up migration.
- New hook `src/hooks/useMvpSuggestion.tsx`: lists unmatched fixtures (`games_schedule` rows with `scheduled_at <= now()` and no `games` row) and, for the selected one, tallies `mvp_votes` plus `mvp_vote_winners` / `mvp_votes_finalized_at`. Admin read access already exists via the "Admins can view mvp votes" policy.
- Player names resolve from the `players` list already passed to `GameInput`; suggestions are limited to the entered lineups once players are added. Edit mode keeps the saved fixture and MVPs.
