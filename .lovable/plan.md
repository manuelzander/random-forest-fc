# MVP vote reminder banner

A quiet reminder for signed-in players who are on a game roster with an open MVP vote and haven't voted yet.

## Where it shows

- **Main page** — a slim glass strip just above the season banner / cards.
- **Game signup pages** — only on pages where that game has no open vote of its own (so it never sits above a vote card you can already use). If the page's own vote is open, nothing extra appears.

Not shown to visitors who aren't signed in, to guests, to waitlisted players, or once the vote is cast.

## What it says

`Your MVP vote is open for Tue 15 Sep - closes in 2 days` with a "Vote now" link that goes to that game's signup page (and scrolls to the vote section). If several games have open votes, the one closing soonest is shown, with a small "+1 more" hint.

Dismissible with a small x; it comes back on the next visit until the vote is cast.

## Design

Reuses the existing glass banner look: soft border, faint gradient, the same pulsing green dot used for open ballots (synced with the other pulses), trophy icon, single line on desktop and wrapping to two lines on mobile. No new colours, no layout shift on pages that have nothing to show.

## Technical notes

- New hook `src/hooks/useOpenMvpReminders.tsx`: for the signed-in user, finds fixtures kicked off within the 72h window, calls the existing `get_mvp_vote_state` RPC per candidate fixture, and keeps only those with `is_open && am_eligible && !my_vote`. Returns them sorted by `closes_at`.
- New component `src/components/MvpVoteReminder.tsx` rendering the banner from that hook; dismissal held in component state only (no storage), so it returns next visit.
- Mounted in `src/pages/Index.tsx` above the season banner, and in `src/pages/GameSignup.tsx` above the nav row, suppressed there when the page's own `useMvpVote` state `is_open`.
- No schema, RLS, voting-window or points changes; the banner reads existing state only.
