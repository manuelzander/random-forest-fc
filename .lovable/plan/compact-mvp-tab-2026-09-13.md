# Compact MVP tab

Make the recent-games vote area on the MVP tab tighter: three fixtures shown as three side-by-side cards, with the MVP Leaders table underneath.

## What changes

- Show the 3 most recent past fixtures instead of 5.
- Each fixture becomes its own standalone card, laid out in a row of three on desktop (stacking to one column on mobile) — same glass card look as the signup page panel.
- Inside each card, a slimmer version of the vote block:
  - Date heading with the Open (pulsing green) / Closed badge, as today.
  - One meta line: countdown or close time, plus "x of y voted", and the progress bar.
  - Voting: tap-a-name list stays, but the long explanation note is dropped in this compact view (it stays on the signup page). Non-eligible visitors see a short lock line.
  - Closed: winner row plus the tally list, with the tally trimmed to the top few names and no bars, so the three cards stay similar in height.
- MVP Leaders keeps its current card and sits directly below the three fixture cards.
- Archived seasons: the same three-card row, each showing the recorded winner read-only.

## Technical notes

- `MvpVoteCard` gets an optional `compact` boolean prop: tighter spacing, hides the instructional info-note, hides the per-row vote bars, and caps the closed tally list. Default behaviour on `/signup/:gameId` is unchanged.
- `MvpTab.tsx`: fixture query limit 5 to 3; the fixture list wraps in `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` with each fixture in its own `Card` (glass) instead of rows inside one card. The "MVP Votes" section header stays above the grid.
- No changes to voting rules, eligibility, RLS, polling or point awards.
