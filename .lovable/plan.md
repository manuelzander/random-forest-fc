# MVP voting on the game signup page

After kickoff, everyone who was on the roster can vote for the game's MVP straight from the signup page. Votes stay secret while voting is open, and when the 48h window closes the winner becomes the official MVP.

## How it works

- **Who votes:** signed-up players with an account. Guests can't vote, and dropouts can't either. One vote per player, changeable while the window is open. You can't vote for yourself.
- **Window:** opens at the scheduled kickoff time, closes 48 hours later.
- **Secret ballot:** while open, players only see "9 of 14 voted" plus their own pick. No counts, no leader.
- **Close:** at +48h the vote counts are revealed with a small ranked list, and the winner is written as the official MVP of that game. Tie → the earliest-cast vote among the tied players wins (deterministic, no admin action). Zero votes → no MVP, card just says voting closed with no votes.

## What it looks like

A new "MVP Vote" glass card on the signup page, sitting directly under the roster, matching the Season Schedule / roster styling.

```text
┌─────────────────────────────────────────────┐
│ ⭐ MVP VOTE            [Voting open · 41h]  │
├─────────────────────────────────────────────┤
│  9 of 14 players voted                      │
│  ▓▓▓▓▓▓▓▓▓░░░░░  (progress rail)            │
│                                             │
│  ( avatar ) Marcus T.            [ Vote ]   │
│  ( avatar ) Darroch C.        ✓ Your pick   │
│  ( avatar ) Toby R.              [ Vote ]   │
│                                             │
│  Results revealed when voting closes.       │
└─────────────────────────────────────────────┘
```

States of the card:
1. **Before kickoff** — a quiet line: "MVP voting opens after kickoff." (no list)
2. **Open, not voted** — roster rows with a Vote button each; your own row is disabled with "You".
3. **Open, voted** — your pick highlighted with a gold trophy accent and a "Change vote" affordance; still no counts.
4. **Closed** — winner shown on top as a gold trophy tile ("MVP · Darroch C. · 6 votes"), then the rest as small count rows.
5. **Not eligible** (not signed up / guest / logged out) — read-only version: progress line while open, full results once closed, with a hint to sign in.

Visual language reuses existing tokens: `card-header-glass` header, `badge-trophy` gold for the winner, `status-badge` pills for the open/closed state, `slot-number`-style avatars, primary green for the active vote button.

## Technical scope

**Database (migration)**
- `public.mvp_votes`: `id`, `game_schedule_id` (fk → games_schedule), `voter_player_id` (fk → players), `voted_player_id` (fk → players), `created_at`; unique on (`game_schedule_id`, `voter_player_id`).
- GRANTs: `SELECT` to `anon`/`authenticated`, `INSERT/UPDATE/DELETE` to `authenticated`, `ALL` to `service_role`. RLS on.
- Policies: insert/update/delete only when `voter_player_id` belongs to `auth.uid()`, the voter has a non-dropout signup for that game, `voted_player_id` is on the same roster, `voted_player_id <> voter_player_id`, and `now()` is between kickoff and kickoff + 48h (enforced in a `security definer` helper `can_vote_mvp(...)` to keep the policy readable). Select is open (counts are hidden at the UI layer, and the tally is public once closed).
- `games.game_schedule_id` nullable fk → `games_schedule`, so a result row can be tied back to the scheduled game. Backfill is not attempted for old rows.
- Archive parity: `archived_mvp_votes` plus season-archive handling so votes travel with the season.

**Finalisation**
- New edge function `tally-mvp-votes`, run hourly by cron: for each schedule whose window has just closed, compute the winner and set `mvp_player` on the linked `games` row (creating nothing — if no result row exists yet, it stores the winner and applies it as soon as the result is entered). Idempotent, never overwrites a manually set MVP.
- Optional Telegram line announcing the MVP when a vote finalises, reusing `telegramNotify`.

**Frontend**
- `src/components/MvpVoteCard.tsx` — the card, all five states, optimistic vote toggle.
- `src/hooks/useMvpVotes.tsx` — fetch votes + roster, derive eligibility, window state and (once closed) the tally; realtime subscription so counts and the "x of y voted" line update live.
- `src/pages/GameSignup.tsx` — render the card under the roster.
- Admin game entry (`GameInput.tsx` / `AdminGameManagement.tsx`) pre-selects the voted MVP when a schedule is linked, with a small "from player vote" note; admin can still override.

## Not changing

Signup/dropout logic, debt and credit rules, points formula (MVP still worth +1 point), existing badges and layout elsewhere.
