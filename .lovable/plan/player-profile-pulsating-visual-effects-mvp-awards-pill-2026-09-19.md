# Player Profile — Pulsating Visual Effects + MVP Awards Pill

The public profile (`/player/:id`) already has a glass hero panel with a static avatar glow and meta pills for Points and Win Rate. MVP awards are already calculated (`player.mvp_awards`) and shown in the Statistics grid, but not in the hero. This pass adds ambient motion and an MVP pill to the hero.

## Changes

**Hero panel motion (`src/pages/PlayerProfile.tsx`, `src/index.css`)**
- The avatar's glow ring starts to breathe: a soft, slow pulsing aura behind the photo (emerald, ~3s cycle) instead of the static glow.
- The hero's corner glow blob (`.hero-glow`) gently drifts/pulses, matching the app's aurora feel.
- A faint shimmer sweeps across the hero's bottom gradient underline occasionally (very subtle, slow).

**MVP pill in the hero**
- Add a third meta pill next to Points and Win Rate: gold trophy icon + `N MVPs`, using the amber/gold tones the rest of the app reserves for trophies.
- Only shown when the player has at least one MVP award. When they do, the pill gets a gentle gold pulse (same synced-feel as the signup page's green pulsing badges) so it reads as a "live achievement".
- Keep Points / Win Rate pills unchanged.

**Technical notes**
- New utilities in `src/index.css` (built from existing tokens, no new hex values): e.g. `.avatar-aura-pulse`, `.hero-glow-drift`, `.hero-underline-shimmer`, `.mvp-pill-pulse` — all respecting `prefers-reduced-motion`.
- Files touched: `src/index.css`, `src/pages/PlayerProfile.tsx`. No data, query, or logic changes — `mvp_awards` is already fetched and computed for both current and archived seasons.
