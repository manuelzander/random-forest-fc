# Remove double-boxed form fields

## Goal
Stop wrapping single inputs in their own glass box. Fields should read like the "Add New Article" form: one clean bordered input with its label as placeholder text inside, sitting directly on the surrounding card.

## The rule to apply app-wide
- A single input/select/textarea gets **no** extra glass wrapper. Placeholder carries the field name ("Email", "Password", "Article title"). Labels stay for screen readers (visually hidden) or are dropped where the placeholder already says it.
- Glass grouping boxes are kept **only** for genuine multi-field groups (e.g. a team roster block with a select plus a player list), not for one field.
- Spacing between fields comes from the parent stack, so removing the box must not collapse the rhythm.

## Where it changes
1. **Sign in / Sign up** (`Auth.tsx`) — email, password, display name become plain inputs inside the auth panel; no per-field box.
2. **Add New Game** (`GameInput.tsx`) — score inputs, captain selects, MVP select, and YouTube URL lose their individual boxes. Team 1 / Team 2 player blocks stay grouped since each holds a select plus a roster list, but the inner fields inside them are plain.
3. **Schedule New Game** (`AdminScheduleManagement.tsx`) — date, time, pitch size, cost fields become plain inputs; same for the edit-game dialog.
4. **Account Settings** (`AccountDetailsEditor.tsx`) — name, email, password field groups follow the same treatment; balance stat tiles stay as they are.
5. **Any remaining single-field `form-field-glass` / `glass-form-section` usage** found elsewhere (player/guest dialogs, news management) is normalised the same way.

## Not changing
- Card headers, stat tiles, list rows, badges, palette, typography.
- Any form logic, validation, or submitted data.

## Technical scope
- Presentation-only edits in `src/pages/Auth.tsx`, `src/components/GameInput.tsx`, `src/components/AdminScheduleManagement.tsx`, `src/components/AccountDetailsEditor.tsx`, plus a sweep for other single-field wrappers.
- `src/index.css`: keep `.form-field-glass` / `.glass-form-section` only if still used by real multi-field groups; otherwise remove the now-unused class.
- Verify sign-in, admin game entry, and schedule forms at desktop and mobile widths after the change.
