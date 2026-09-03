# Player card redesign (Admin → Player Management)

Rebuild each player row as a two-zone card: identity on the left, finances as a right-aligned stat block, action buttons stay exactly as they are.

## Layout

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ (AV)  AARONYJM  [Verified]            DEBT    CREDIT    NET   [buttons]  │
│       12 games · aaronyjm@icloud.com  £0.00   £0.00   £0.00              │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Name**: bigger — display font, uppercase, `text-lg sm:text-2xl`, still links to the public profile, truncates on one line. Status badge (Verified / Unverified) sits beside it.
- **Meta micro-line**: one muted line under the name — `12 games · email@example.com` — small, truncated, full email on hover via title attribute. Replaces the current pills.
- **Finance block**: right-aligned group of three small columns (Debt / Credit / Net) with uppercase micro-labels above each value. Debt in destructive tint, Credit in primary, Net in primary or destructive by sign with a leading minus when negative. All three always shown.
- **Buttons**: unchanged (same icons, sizes, order, archive hiding).
- **Mobile**: identity block on top, finance columns wrap to a full-width row beneath it, buttons last — no horizontal scrolling.

## Technical notes

- Single file: `src/components/AdminPlayerManagement.tsx`, the row inside the players list. No data, query, or debt-calculation changes.
- Reuses existing tokens: `glass-row`, `font-display`, `status-badge*`, `primary` / `destructive` / `muted-foreground`. Finance micro-labels use the same uppercase tracked style as `.stat-tile-label`.
- Removes the `Mail` / `Trophy` pill treatment added in the previous pass (and their imports if unused).
- No hardcoded colour utilities.
