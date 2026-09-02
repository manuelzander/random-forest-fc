# MVP vote moves inside the signup card, above the roster

## What changes

- The MVP Vote block stops being a separate floating card below the roster. It becomes a section **inside** the main signup panel, sitting directly between the game header and "PLAYERS SIGNED UP", separated by the same subtle top border / tinted band used for the roster section.
- The info box "This game has already taken place. The roster below is shown for reference." is removed.
- Section heading matches the roster heading style (display font, uppercase "MVP VOTE"), with the existing green pulsing Open / muted Closed badge on the right — same as the `12 / 14` badge treatment.
- No change to voting rules, eligibility, window, results, or the roster list itself.

```text
┌ glass panel ──────────────────────────┐
│ JOIN THIS GAME                        │
│ Tue, Sep 1 • 7:15 PM • Big pitch      │
├───────────────────────────────────────┤
│ MVP VOTE                    [ OPEN ]  │
│ closes in 2 days • 5 of 11 voted      │
│ ▓▓▓▓▓░░░░░░                           │
│ (name rows / results)                 │
├───────────────────────────────────────┤
│ PLAYERS SIGNED UP            12 / 14  │
│ #1 …                                  │
└───────────────────────────────────────┘
```

## Technical scope

- `src/components/MvpVoteCard.tsx`: drop the `Card`/`CardHeader`/`CardContent` shell in favour of a plain section wrapper with the heading + status badge row, keeping all existing states (open/closed/ineligible/no-votes) and logic untouched. Returns `null` as today before kick-off.
- `src/pages/GameSignup.tsx`:
  - remove the `isPastGame` info-note block (lines ~805-808) and the now-unused `Clock` usage there if it is not needed elsewhere (it is still used by roster badges, so the import stays);
  - render `<MvpVoteCard …>` inside the `glass-panel`, above the player list section, wrapped in `bg-white/[0.02] border-t border-white/10 p-6 sm:p-8` to mirror the roster band;
  - delete the old `mt-6` wrapper below the panel.

## Not changing

Voting eligibility, 72h window, tally/finalisation, roster ordering, badges, admin views.
