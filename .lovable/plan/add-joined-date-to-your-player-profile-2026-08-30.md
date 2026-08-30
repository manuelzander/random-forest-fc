# Add "Joined" date to Your Player Profile

Yes, the data exists: the `players` table has a `created_at` timestamp (when the player record was created), and `profiles` has its own `created_at` (account signup). The player record's date is the better "joined the league" signal, so use that.

## Change

- In the profile hero panel (next to the "Verified" badge under the player name), add a small glass meta pill: a calendar icon plus `Joined Aug 2026`.
- Format as month + year (e.g. "Joined Aug 2026") to stay compact; full date shown on hover via title attribute.
- Falls back to hiding the pill entirely if no timestamp is available.

## Technical notes

- `src/components/StreamlinedProfile.tsx`: keep `created_at` from the existing `players` select (`select('*')` already returns it) when building `currentUserPlayer`, and render the pill in the hero row using the existing `.status-badge`/meta pill styling — no new CSS.
- `src/types/index.ts`: add optional `created_at?: string` to the `Player` interface.
- No database, query, or logic changes.
