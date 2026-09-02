# Bibs: an extra point for taking the bibs home

Add a "Bibs" pick to the game result entry, working exactly like MVP: one optional player from that game's lineup, worth +1 point in the main player ranking.

## What changes for users

- **Game entry form** — a new optional "Bibs player" dropdown right under the MVP dropdown, listing the same players who played in the game. Also pre-filled when editing an existing result.
- **Game History** — a small badge next to the bibs player's name in the lineup, same size and shape as the MVP badge but visually distinct: lila (the existing guest-badge lila tone) with a shirt/laundry symbol instead of the gold crown, labelled "Bibs".
- **Points** — the bibs player gets +1 point, added the same way MVP is (3 win / 1 draw / +1 MVP / +1 Bibs). Rankings, profiles and achievements all pick this up automatically since they use the same points source.

No Bibs column in the ranking table, no changes to MVP voting, debt, signups or badges.

## Technical scope

**Database migration**
- `games.bibs_player uuid` nullable, FK → `players(id)`; same column on `archived_games` for season-archive parity.
- Update `get_player_stats()`, `get_player_achievements()` and `get_archived_player_achievements(uuid)` so the participant expansion also flags `is_bibs` (`player_id = g.bibs_player`) and the points sum adds `+1` per bibs award. Games-played, wins/draws/losses, MVP counts and goal difference stay unchanged.

**Frontend**
- `src/components/GameInput.tsx` — `bibsPlayer` state, select mirroring the MVP one, same "must be a playing player" validation, included in the submitted payload.
- `src/components/AdminGameManagement.tsx` — persist `bibs_player` on insert and update, pass it back into the edit form, and show the Bibs badge in its lineup lists.
- `src/components/GamesList.tsx` — render the Bibs badge next to the player name (reusing existing badge tokens, distinct from the gold MVP crown).
- `src/types/index.ts` and local game interfaces — add `bibs_player?: string | null`.

Season archiving copies whole rows, so archived results keep their bibs pick once the column exists.
