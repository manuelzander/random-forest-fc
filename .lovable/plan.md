# Tied MVP votes: admin decides the winner

Today a tie is silently broken by whoever received their first vote earliest, so a joint result quietly becomes one player's award. Instead, a tie stays a tie until an admin picks the winner.

## What changes

- When voting closes with two or more players on the same top vote count, no MVP is awarded automatically.
- The MVP card on the game signup page shows the full tally as it does now, plus a clear line: "Tied on 4 votes — the winner will be confirmed shortly." The tied players are highlighted instead of one gold winner tile.
- In Admin → Schedule Management, the game's MVP row reads "MVP voting tied · Sam / Alex on 4 votes" with a small "Pick winner" action next to it. Choosing a name confirms the MVP, and the row switches to the usual gold winner badge.
- Once confirmed, the winner flows through exactly as before: it gets written onto the game result and counts for the MVP point.
- A clear single-winner result behaves exactly as it does today — awarded automatically, no admin step.
- Nobody voted: unchanged, the card says voting closed with no votes and an admin can still set the MVP by hand when entering the result.

```text
Sep 1, 6:15 PM · Big pitch · Created Aug 26
● MVP voting tied · Sam T. / Alex R. on 4 votes   [ Pick winner ]
```

## Technical scope

**Database (migration)**
- `finalize_mvp_vote(_game_schedule_id)`: replace the earliest-vote tie-break with a tie check. If exactly one player holds the top count, behave as now (set `mvp_vote_winner`, stamp `mvp_votes_finalized_at`, push to `games.mvp_player` when empty). If two or more tie, leave `mvp_vote_winner` NULL and do not stamp `mvp_votes_finalized_at`, so the ballot stays resolvable.
- `get_mvp_vote_state(_game_schedule_id)`: add `is_tie` (boolean) and `tied_player_ids` (array) to the returned JSON, derived from the closed tally.
- New `resolve_mvp_tie(_game_schedule_id uuid, _winner_player_id uuid)` security-definer function, admin-only via `has_role(auth.uid(),'admin')`: validates the chosen player is among the tied top-vote players, sets `mvp_vote_winner` + `mvp_votes_finalized_at`, and applies `games.mvp_player` when still empty.
- No new tables, no grant/RLS changes needed (admins already manage `games_schedule`).

**Frontend**
- `src/hooks/useMvpVote.tsx` — extend `MvpVoteState` with the two new fields.
- `src/components/MvpVoteCard.tsx` — tie branch in the closed state: tied rows highlighted, explanatory line, no gold winner tile until resolved.
- `src/components/AdminScheduleManagement.tsx` — `getMvpStatus` gains a `tied` phase (top count shared by more than one player and no `mvp_vote_winner`); render the tie line plus a small dropdown/dialog calling `resolve_mvp_tie`, then refresh.
- `src/components/GameInput.tsx` — unchanged behaviour; an unresolved tie simply leaves the MVP field empty for manual selection.

Archived seasons are read-only and keep whatever winner they already have.
