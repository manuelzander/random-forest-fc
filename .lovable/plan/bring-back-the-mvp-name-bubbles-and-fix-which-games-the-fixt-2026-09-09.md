# Bring back the MVP name bubbles, and fix which games the fixture list offers

## 1. Restore the MVP bubbles (revert)

The name bubbles under the MVP field go back exactly as they were: tapping a name toggles it, up to two joint MVPs, crown chip on the chosen ones, and a short hint when a third is attempted. This matches the team-selection bubbles right above, and is the only workable way to pick two MVPs. The dropdown-only version is dropped.

Also re-fix the bug found while removing them: choosing a game from the fixture list always re-applies that game's vote result, even when the same game is chosen again after the MVP field was cleared.

## 2. Why only "Tue 1 Sep" shows in the list

Checked the current data. Three past fixtures exist:

- Tue 1 Sep, 18:15, big pitch — voting closed, winner Pavlos, 6 votes — **no result points at it**
- Tue 8 Sep, 18:15, big pitch — 8 votes, voting still open — a result already points at it
- Tue 8 Sep, 19:00, small pitch — 6 votes, voting still open — a result already points at it

So the list is behaving as designed (it hides fixtures that already have a result), but the underlying linking went wrong: the result you entered at 01:17 with Pavlos as MVP — which is the Sep 1 game — got attached to the Tue 8 Sep 18:15 fixture. The two later results then took the remaining Sep 8 slots, and a third result was saved with no fixture at all. Result: the one fixture genuinely still needing a result (Sep 1) looks unmatched, and both Sep 8 fixtures look done.

## 3. What we change

**a. Repair the existing links (one-off data fix)**
- Point the Pavlos result at the Sep 1 fixture.
- Point the other two saved results at the two Sep 8 fixtures by kickoff order, so each fixture holds the result actually played on it. If the intended pairing is ambiguous I will list the three results with their scores and lineups and ask you to confirm before writing anything.

**b. Make the fixture list forgiving**
- The list keeps showing unmatched fixtures first, oldest first, but also includes already-matched past fixtures in a second group labelled "already has a result", so a mis-link can be corrected from the form instead of needing a database fix.
- Each entry shows its vote state inline: "closed · winner Pavlos", "voting open · 8 votes", or "no votes".
- Picking a fixture that already has a result shows a short warning line that saving will create a second result for it.

**c. Make wrong auto-matching less likely**
- When no fixture is chosen, the automatic fallback stays, but the form defaults the selector to the oldest unmatched past fixture instead of leaving it blank, so a result almost always carries an explicit fixture.

## Technical notes

- `src/components/GameInput.tsx` — restore the removed bubble block and the toggle handler; keep the `useEffect` that applies `suggestedWinners` keyed on the selected fixture id so re-selection re-applies (use a change counter so identical ids still trigger).
- `src/hooks/useMvpSuggestion.tsx` — return two lists (`unmatched`, `matched`) instead of filtering matched fixtures out; add per-fixture vote counts to the fixture query so the list can show state without extra fetches.
- Data fix via migration `UPDATE public.games SET game_schedule_id = ... WHERE id = ...` for the three rows; no schema change.
- No changes to voting rules, finalisation, signups, debt, or the public signup page.
