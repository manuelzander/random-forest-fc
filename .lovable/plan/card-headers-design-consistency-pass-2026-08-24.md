# Card Headers & Design Consistency Pass

## The problem

Two competing header styles exist. Public cards ("Player Ranking", "Player Achievements", "Game History", "Schedule", "Latest News") use a solid green gradient bar (`card-header-gradient-primary`), which fights the dark glass aesthetic. Admin cards ("Game Management", "Player Management", "News") use a lean, plain header — which looks better and is what you preferred.

On top of that, an amber "Archived" badge is bolted onto three headers (Game History, Schedule, Debt) even though the Season Banner right above already tells you which season you're viewing. The amber is also the only amber in the app outside of warnings.

## What changes

1. **One lean glass header style for every card.** Replace the green gradient bar with a subtle glass header: a hairline bottom border, an icon tinted in the accent colour of the section, and the title in the display font. No solid colour block. Applies to Player Ranking, Player Achievements, Game History, Schedule, Latest News, and the Admin cards (which already match this direction and stay visually stable).

2. **Remove the "Archived" badges** from Game History, Schedule, and Debt headers. Season context lives in the Season Banner. This makes last season's "Game History" read identically to this season's "Game Management" card.

3. **Colour cleanup** across the app:
   - Rank badges on the leaderboard/trophies (bright yellow/amber/blue gradients with hardcoded white and black text) toned down to consistent glass-tinted rank pills so gold/silver/bronze still reads but doesn't glare.
   - Destructive dialog buttons that use raw `bg-orange-600` (unclaim player, remove skill, remove player from team) switched to the standard destructive variant.
   - `SkillRadarChart` light-mode leftovers (`bg-amber-50`, `text-purple-600`, `bg-green-600`) collapsed to their dark values only, since the app is dark-only now.
   - Trophy/MVP badges keep a single shared amber-gold token instead of four slightly different yellows.

4. Keep amber strictly for genuine warnings (e.g. the 24h dropout warning on the signup page) so it carries meaning again.

## Technical notes

- Retire `card-header-gradient-primary` / `card-header-gradient-news` in `src/index.css` and add a `.card-header-glass` component class plus a shared `.rank-pill` / gold badge token set.
- Files touched: `src/index.css`, `PlayerTable.tsx`, `AchievementsTable.tsx`, `GamesList.tsx`, `ScheduleDisplay.tsx`, `AdminDebtManagement.tsx`, `AdminGameManagement.tsx`, `AdminPlayerManagement.tsx`, `AdminNewsManagement.tsx`, `SkillRadarChart.tsx`, `GameInput.tsx`, `ProfileSkillsEditor.tsx`, `PlayerProfile.tsx`, `pages/News.tsx`, `pages/Index.tsx`.
- Presentation-only: no data fetching, season logic, or business rules change.
- Verify with Playwright screenshots on Home (Ranking, Trophies, Games, Schedule, News), both live and archive season, plus News and Player Profile.
