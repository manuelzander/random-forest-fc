# Player Profile & "Your Player Profile" — Glass Aurora polish

Bring both profile surfaces up to the Season Banner / Glass Aurora standard: a proper hero identity block, tidier stat tiles, and consistent glass framing. Presentation only — no data or logic changes.

## Public Player Profile (`/player/:id`)

**Hero card**
- Turn the top card into a glass hero panel: soft aurora glow behind the avatar, hairline gradient underline at the bottom of the panel (same treatment as the page header).
- Avatar gets a subtle ring + glow instead of a flat circle.
- Player name in the display font (Bebas Neue, uppercase, tracked) so it matches the wordmark and card titles.
- Points / Win rate move into two compact glass "key stat" pills next to the name rather than plain grey text lines; position / club / years playing stay as one muted meta row with icons.
- Badges row unchanged in behaviour, just spacing tightened under the meta row.

**Statistics card**
- One shared stat-tile style (`.stat-tile`) instead of the mixed `bg-muted/50` blocks: glass surface, hairline border, subtle hover lift.
- Wins / Draws / Losses stay tinted (green / amber / red) but as glass tints, aligned with the same tile shape.
- Form (Last 6) block: label above, squares become slightly rounded glass chips with a soft glow on wins; keep colour meaning identical.
- Trim the colour zoo in the 2-column grid — numbers use primary / aurora-blue / aurora-purple / amber / destructive only, no `indigo-400`, `violet-400`, `emerald-400`, `purple-400` one-offs.

**Skills / Signature Moves**
- Keep card headers as-is (already glass); improve the empty states to a centred glass placeholder tile instead of bare icon + text.

## "Your Player Profile" (Profile page)

- Hero row mirrors the public profile: avatar with glow ring, name in display font, plus small glass meta pills (Verified status, debt/credit hint already lives in Account Details so no duplication).
- Action buttons (Save / Unclaim / Delete) become consistent glass pills — Save keeps primary fill, Unclaim/Delete use outline glass with primary / destructive tint on hover.
- "Get Your Player" empty state and the claim list rows get the same `.stat-tile`-style glass rows and a clearer divider.
- Skills editor and Account Details cards keep their current glass headers; only inner surfaces (inputs groups, skill chip picker) are aligned to the shared glass tokens.

## Technical notes

- New shared utilities in `src/index.css`: `.stat-tile`, `.stat-tile-value`, `.stat-tile-label`, `.hero-panel`, `.avatar-glow`, `.meta-pill`. All built from existing tokens (`--aurora-*`, `primary`, `destructive`) — no new hex values, no hardcoded colour utilities.
- Files touched: `src/index.css`, `src/pages/PlayerProfile.tsx`, `src/components/StreamlinedProfile.tsx`, and light touch-ups in `src/components/ProfileSkillsEditor.tsx` / `AccountDetailsEditor.tsx`.
- No changes to queries, stat calculations, badge logic, or debt calculation.
