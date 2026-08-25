# Aurora-glass consistency pass

## Goal
Extend the app’s **current preview styling** across the remaining visually older surfaces. Keep the existing dark Glass Aurora palette, Bebas Neue/Barlow typography, page structure, information density, and all behavior unchanged.

## Changes

### 1. Finish the shared visual vocabulary
- Consolidate the existing glass treatments into reusable semantic patterns for management headers, toolbar rows, list rows, form groups, stat summaries, empty states, and compact action controls.
- Reuse the current emerald, blue, lilac, destructive, trophy, and neutral roles; do not introduce a new palette or decorative style.
- Keep glow and motion restrained and provide reduced-motion behavior.

### 2. Bring the remaining public/account surfaces into the current system
- Refine the sign-in/sign-up page so its brand treatment, tab switcher, fields, loading/error states, and main panel match the current header, season banner, and profile styling.
- Refine the standalone News page with the same section header, date metadata, article rhythm, pagination controls, and empty state used elsewhere.
- Align Account Settings balance summaries and field groups with the existing stat-tile and glass form-field treatments, while preserving all update flows.

### 3. Unify admin management surfaces
- Standardize Player, Game, Schedule, Debt, and News management headers to the existing glass card-header pattern.
- Replace plain bordered list rows with the same subtle glass rows, spacing, hover feedback, and compact icon actions already used in the public ranking, schedule, and game-history views.
- Align admin stat summaries, filters/toolbars, status badges, empty/loading states, and dialog forms without changing admin workflows.
- Give the game-entry form clearer glass field groupings for teams, captains, score, MVP, and video while retaining its current inputs and validation.

### 4. Consistency and responsive review
- Remove remaining one-off visual treatments where a shared semantic class already exists, including raw white glass borders/backgrounds in feature components where practical.
- Check desktop and mobile layouts for header rhythm, nested-card appearance, clipped labels, action-button sizing, and long player/article names.
- Verify public tabs and routes plus authenticated profile/admin routes where a managed preview session is available.

## Technical scope
- Primary styling work will use `src/index.css` semantic component classes and existing shadcn primitives.
- Expected component scope includes `Auth.tsx`, `News.tsx`, `AccountDetailsEditor.tsx`, admin management components, and `GameInput.tsx`; only related presentation code will change.
- No database, season logic, signup logic, debt calculations, permissions, or API behavior will be modified.
