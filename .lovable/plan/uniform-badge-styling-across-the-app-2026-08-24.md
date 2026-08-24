# Uniform badge styling across the app

The shared badge tokens exist in `src/index.css` but several places still use one-off inline colors — notably blue "Unverified" on the main Player Ranking table. This pass makes every badge use the shared tokens.

## Token set (already defined, extended slightly)

- `status-badge status-badge-verified` — green (Verified)
- `status-badge status-badge-unverified` — neutral glass grey (Unverified)
- `status-badge status-badge-guest` — lila (Guest)
- `badge-trophy` — gold (trophies, achievements, MVP)
- `badge-skill` — glass chip (signature moves)
- New: `status-badge-waitlist` (blue, aurora-blue — the one legitimate blue meaning "waiting") and `status-badge-dropout` (destructive red), so those two states are also tokenised instead of inline classes.

## Places to fix

1. `src/components/PlayerTable.tsx` — Verified/Unverified badges use inline primary/aurora-blue classes; switch to the shared status tokens (this is the bug reported).
2. `src/components/AdminScheduleManagement.tsx` — Verified, Guest, Unverified, Waitlist, Dropout badges all inline; switch to tokens (Guest becomes lila, Unverified becomes grey).
3. `src/components/ScheduleDisplay.tsx` — Waitlist and Dropout inline badges → tokens; add the missing Unverified badge case so it matches the admin/signup views.
4. `src/pages/GameSignup.tsx` — Verified, Guest, Unverified, Waitlist, Dropout badges all inline → tokens.
5. `src/components/AdminGameManagement.tsx` — MVP badges use inline amber → `badge-trophy`.
6. `src/components/GamesList.tsx` — team/score `variant="secondary"` mini badges given a consistent neutral glass style to match the rest.
7. `src/components/AchievementsTable.tsx` — player name link hover uses aurora-blue; align with `hover:text-primary` as elsewhere.

## Notes

Purely presentational: no logic, data, or badge-eligibility rules change. Rank pills (gold/silver/bronze) stay as they are since they encode position, not status.

After the edits I will screenshot the home page (Ranking + Trophies), the schedule, a public signup page, and the admin Schedule/Games/Debt tabs to confirm badges look identical everywhere.
