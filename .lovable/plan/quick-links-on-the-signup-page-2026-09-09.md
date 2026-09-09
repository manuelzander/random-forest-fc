# Quick links on the signup page

Add a slim navigation row at the top of `/signup/:gameId` so players can get back to the home page, and jump straight to the other game scheduled on the same day.

## What the player sees

Above the game card, a row of small glass pills:

```text
[ ← Home ]        [ 8:30 PM · Big pitch → ]
```

- **Home** pill, always shown, on the left; goes to the main page.
- One pill per other game scheduled on the same calendar day as this game, on the right, labelled with its kick-off time and pitch size. Tapping it opens that game's signup page.
- Deliberately quiet styling: muted text, hairline border, faint glass fill, colour only on hover. Nothing pulses or glows, so the row reads as navigation rather than an action.
- If there is no second game that day, the single Home pill sits alone on the left at the same height and spacing — the row keeps its shape, so it still looks balanced rather than half-empty.
- Visible to everyone, signed in or not, and also on past games (so you can hop between both games of a day afterwards too).
- Pills wrap onto a second line on narrow screens.


## Technical notes

- `src/pages/GameSignup.tsx`: add a small `sameDayLinks` state holding every other `games_schedule` row that falls on the same calendar day as the current game (id, `scheduled_at`, `pitch_size`), fetched alongside the existing game fetch. This is independent of the current login-gated same-day join/leave lists, which stay exactly as they are.
- Render a new nav row inside `relative z-10 max-w-md mx-auto`, above the `glass-panel`, using the existing `header-nav-button` pill token, `ArrowLeft`/`ArrowRight` lucide icons and `react-router` `Link`. No new colors or tokens.
- No changes to signup, cancel, dropout, waitlist, MVP, or Telegram logic; no database changes.
