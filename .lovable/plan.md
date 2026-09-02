# MVP vote status on the admin schedule view

Each scheduled game in Admin → Schedule Management gets one small MVP line next to the pitch badge, so an admin can see at a glance whether voting has started, how it is progressing, and who won — without opening the public signup page.

## What it shows

Three states, one compact row per game:

```text
Sep 9, 6:15 PM                             [Small pitch]
Created Sep 2                              MVP: not open yet

Sep 2, 6:15 PM                             [Small pitch]
Created Aug 26                             MVP: voting open · 7 of 12 voted

Aug 26, 6:15 PM                            [Small pitch]
Created Aug 19                             MVP: Darroch C. · 6 votes
```

- **Before kick-off** — "MVP: not open yet" in muted text.
- **Voting open** — green pill "Voting open" plus "x of y voted", matching the wording already used on the signup card.
- **Closed** — the winner's name with vote count in a gold trophy badge; "no votes cast" when the ballot was empty.

Kept read-only and text-only: no vote list, no per-voter detail, no admin controls. Existing controls (Copy URL, edit, delete, signup management) are untouched.

## Technical scope

- `src/components/AdminScheduleManagement.tsx`
  - In `fetchData`, add one aggregate fetch of `mvp_votes` (paginated via `fetchAllPages`) joined to `players` for the voted player's name, grouped in memory per `game_schedule_id`: total votes, and top player by count with the earliest-vote tie-break already used by `finalize_mvp_vote`.
  - Derive per game: kicked-off / open / closed from `scheduled_at` and the 72h window, and the eligible-voter denominator from the signups already loaded (first 12/14 by signup order, non-dropouts, with an account) — the same playing-roster rule the ballot uses.
  - Render the status inline in the existing header block beside the pitch badge, reusing `status-badge`, `status-badge-verified` and `badge-trophy` tokens. For closed games prefer `games_schedule.mvp_vote_winner` when set, falling back to the computed top vote.
- `src/types/index.ts` — add `mvp_vote_winner?: string | null` and `mvp_votes_finalized_at?: string | null` to `ScheduledGame` (the admin query already selects `*`).

No database migration, no changes to voting rules, finalisation or the public signup page.
