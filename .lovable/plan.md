# Cancel the other same-day game too

Mirror the "Also playing today" join prompt with a cancel counterpart, so a player who leaves one game can drop the other same-day game without visiting its page.

## Behaviour

- After you cancel (or are marked a dropout for) this game, a slim glass strip appears in the same spot showing the other game scheduled that day that you are still signed up for.
- Copy: "Still signed up today" with time, pitch, and count, plus a right-aligned button.
- Button wording follows the same rules as the game's own cancel button:
  - Outside 24h, or on the waitlist: "Cancel too"
  - Within 24h and in the playing roster: "Cancel (dropout)" — that game is marked a last-minute dropout, so payment is still owed there, matching existing rules.
- Only your own logged-in signup is touched, never guests you added.
- Strip hides for past games and once you have no other same-day signup left.
- While you are still signed up for this game, the existing join prompt keeps its current behaviour — no cancel strip is shown then.

## Technical notes

- Extend the same-day fetch in `src/pages/GameSignup.tsx` to build two lists from the same query: games the player has not joined (existing join offers) and games where the player has an active, non-dropout signup (new cancel offers), including each game's signup count, capacity, the player's position, and their signup id.
- Generalise `src/components/SameDayGamePrompt.tsx` with a `mode` of `join` or `leave` so both strips share one layout and styling; the leave mode uses a muted dot and outline button.
- Add a `leaveSameDayGame` handler that reuses the current cancel semantics for the other game: mark `last_minute_dropout` when within 24h of that game's kickoff and inside its capacity, otherwise delete the signup; then send the removal/dropout Telegram notification and the waitlist-promotion notification when a waitlisted player moves up, using `fetchAllPages` for that game's signups so counts and positions are accurate.
- Refresh state via the existing `fetchGameData` after the action. No database or MVP-voting changes.
