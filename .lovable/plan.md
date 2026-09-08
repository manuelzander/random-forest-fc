# MVP suggestions in the match result form

## Goal

When an admin enters a match result, the MVP field should already know what the players voted, instead of being an empty list of names.

## How it works today

The result form has no knowledge of votes. The vote outcome is only applied silently after saving: if the MVP field was left empty, the result is matched to the most recent scheduled game (within the last 7 days) that has no result yet, and the winners from that vote are filled in. Nothing is shown while typing the result.

## What we add

When the form opens, it finds the same fixture the result will attach to and shows its vote picture:

- A small line above the MVP field, in the existing style: "Player vote: Tom 5 · Ben 3 · Alex 1" with the names clickable to select them as MVP.
- Vote counts shown next to names inside the MVP dropdown, and vote leaders listed at the top.
- If voting has already closed with a clear outcome (one winner, or two tied players sharing it), those names are pre-selected in the field, still fully editable.
- If three or more players tie, nothing is pre-selected and a short note explains that a three-way tie awards no MVP.
- If voting is still open, counts are shown as a live snapshot with a note that voting is still running.
- If there is no matching fixture or no votes, the field behaves exactly as it does now.

Everything stays a suggestion: whatever the admin leaves in the field when saving is what counts.

## Technical notes

- New hook (e.g. `src/hooks/useMvpSuggestion.tsx`): resolves the target fixture with the same rule as the `link_game_to_schedule` trigger (earliest `games_schedule.scheduled_at <= now()` within 7 days having no row in `games`), then reads `mvp_votes` tallies for it plus `mvp_vote_winners` / `mvp_votes_finalized_at`.
- Admin read access already exists: the "Admins can view mvp votes" policy on `mvp_votes` covers open ballots, so counts are visible before closing.
- Player names resolve through the `players` list already passed into `GameInput`; suggestions are filtered to players present in the entered lineups (with the roster names offered as hints when the lineup is still empty).
- `GameInput.tsx` only: suggestion line, dropdown annotations, and initial pre-selection. No database changes, no change to the existing finalization/trigger logic, and edit mode keeps showing the saved MVPs.
