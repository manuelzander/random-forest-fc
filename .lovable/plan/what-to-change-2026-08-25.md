Give long player names more breathing room in the Player Ranking and Player Achievements tables.

## What to change
- **Player Ranking (`src/components/PlayerTable.tsx`)**: The player name link currently uses `whitespace-nowrap`, which forces long names like `darroch.campbell95` to stay on one line and fight for horizontal space. Remove `whitespace-nowrap` so the name can wrap, and make the verification badge sit cleanly on its own line below the name when space is tight.
- **Player Achievements (`src/components/AchievementsTable.tsx`)**: The name link currently uses `truncate`, which cuts off long names with an ellipsis. Remove `truncate` and allow wrapping instead. Stack the verification badge below the name on narrow widths if needed.
- Add a sensible minimum width to the player column in both tables so the name cell doesn't get crushed by stat columns.

## Verification
- Check the Player Ranking and Player Achievements tables in the preview for long names.
- Confirm names wrap instead of being truncated or clipped, and rows expand slightly to accommodate them.
