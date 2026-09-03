# Sign up for both games on the same day

When a player signs up for a game and there's a second game scheduled on the same calendar day, the signup page offers a one-tap way to join that game too — no need to visit the other signup page.

## What the player sees

On `/signup/:gameId`, right under the "You're signed up for this game!" confirmation, a slim glass strip appears:

```text
┌──────────────────────────────────────────────┐
│ ● Also playing today                         │
│   8:30 PM • Big pitch • 9/14                 │
│                          [ Join this too ]   │
└──────────────────────────────────────────────┘
```

- Appears only when: the player is signed up for the current game, is logged in, the game is upcoming, and another upcoming game exists on the same day that they are **not** signed up for.
- One tap on "Join this too" signs them up for the other game and the strip disappears (replaced by nothing — it hides once they're in both).
- If the other game is already at capacity, the button reads "Join waitlist" and the strip notes the waitlist position they'd take.
- Hidden for guests-you-added, past games, and dropout state.

## Technical notes

- `src/pages/GameSignup.tsx`: alongside the existing game fetch, query `games_schedule` for other upcoming games whose `scheduled_at` falls on the same calendar day as the current game (excluding the current id). Fetch their signups with `fetchAllPages` to compute the count/capacity and whether the current player is already in them.
- New small component `src/components/SameDayGamePrompt.tsx` rendered inside the existing signed-up block, styled with the existing glass/`info-note` tokens and the primary green pulse dot — no new colors.
- Joining reuses the exact same insert path as `signUpAsUser` (resolve/create the player row, insert into `games_schedule_signups`), including the existing Telegram notifications: regular signup notification and the game-full notification when it hits capacity.
- After a successful join, refetch so both the strip and the roster reflect the new state.
- No database changes, no changes to MVP voting, dropout, debt, or waitlist logic.
