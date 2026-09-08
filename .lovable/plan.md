# Tied MVP votes: shared award

A tie is currently broken invisibly (whoever got their first vote earliest wins), so a genuinely joint result becomes one player's award. Instead, a tie makes both (or all) tied players MVP of that game.

## Recommendation: share the award, not the point

Two ways to share:

- **Joint MVP, full point each** (recommended) — both tied players get the MVP badge and +1 point. Everything stays whole numbers, the ranking table, badges, points-per-game and trophies keep working exactly as they do now, and the game result screen simply lets you pick more than one MVP.
- **Half a point each** — needs points to become decimals everywhere: the ranking column, the archived season figures, the MVP-count trophies (is "1.5 MVPs" five MVPs for the badge?), and the result screen would have to show and store fractions. It makes every number in the app fuzzier for very little gain, and ties are rare. Not worth it.

So: a two-way tie gives a joint MVP, and each shares the same +1 point a solo MVP gets. A tie of three or more players is treated as no result — nobody is MVP and nobody gets the point.

## What changes

- **Two-way tie** — both players are shown as joint MVPs on the game signup card: a gold tile each ("Joint MVP · 4 votes"). No admin action needed.
- **Three-way or bigger tie** — no MVP awarded. The card says "Vote tied between 3 players — no MVP awarded", the tally is still shown, and nobody gets the extra point. An admin can still set an MVP by hand when entering the result if they want to.
- **Game result screen** — the MVP field becomes a multi-pick capped at two players: tapping names toggles them, chosen ones show the gold crown chip, and it pre-fills with the vote result (one player, two on a two-way tie, none otherwise). Picking a third is blocked with a short hint.
- **Game History** — both joint MVPs get the same crown badge next to their name.
- **Ranking and trophies** — each joint MVP counts one MVP award and one extra point, same as a solo MVP.
- **Admin → Schedule** — the MVP row reads "Joint MVP · Sam T. / Alex R. · 4 votes each", or "Tied between 3 players · no MVP".
- **Nobody voted** — unchanged: card says voting closed with no votes, admin can set the MVP by hand.
- Bibs stays a single player, unchanged.

```text
Sep 1, 6:15 PM · Big pitch · Created Aug 26
● Joint MVP · Sam T. / Alex R. · 4 votes each
```

## Technical scope

**Database (migration)**
- `games.mvp_players uuid[] default '{}'` and the same on `archived_games`; backfilled from the existing `mvp_player`. `mvp_player` stays populated with the first winner so nothing that still reads it breaks, and remains the single-MVP shorthand.
- `games_schedule.mvp_vote_winners uuid[]` alongside the existing `mvp_vote_winner` (first winner), same on `archived_games_schedule`.
- `finalize_mvp_vote`: stop the earliest-vote tie-break. Collect every player on the top vote count into `mvp_vote_winners` (and the first into `mvp_vote_winner`), stamp `mvp_votes_finalized_at`, and push the whole set onto `games.mvp_players` when that game has no MVP yet.
- `get_mvp_vote_state`: return `winner_player_ids` (array) in addition to `winner_player_id`.
- `get_player_achievements`, `get_archived_player_achievements`, `get_player_stats`: change the MVP test from `player_id = mvp_player` to `player_id = ANY(mvp_players)` so each joint MVP scores +1 point and +1 MVP award. Bibs logic untouched.
- `link_game_to_schedule` trigger: carry the winners array through as well.
- Season archiving: copy the new array columns.

**Frontend**
- `src/components/GameInput.tsx` — MVP single select becomes a toggleable multi-select (max sensible: the lineup), pre-filled from the vote; submits `mvpPlayers: string[]`.
- `src/components/AdminGameManagement.tsx` — persist and edit `mvp_players`; keeps writing `mvp_player` as the first entry.
- `src/types/index.ts` — `mvpPlayers: string[]` on `GameInput`, plus the new fields on `ScheduledGame`.
- `src/components/GamesList.tsx` — crown badge for any player in `mvp_players`.
- `src/hooks/useMvpVote.tsx` + `src/components/MvpVoteCard.tsx` — joint-winner state: one gold tile per tied player, "Joint MVP" label, remaining players listed with counts as today.
- `src/components/AdminScheduleManagement.tsx` — `getMvpStatus` returns a list of winners; closed row renders one or several names with "votes each" on a tie.
- `src/pages/PlayerProfile.tsx`, `src/components/StreamlinedProfile.tsx`, `src/components/AdminPlayerManagement.tsx` — MVP bonus counting switches to array membership.

Unchanged: signup/dropout rules, debt and credit, the 72-hour window, Bibs, and archived data other than the backfill.
