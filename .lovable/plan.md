# Align Player Ranking and Player Achievements tables

## Player identity rows
- In Player Ranking, limit the trophy row beneath each name to a maximum of three icons.
- Increase player-name emphasis in both tables to the same `text-base` weight used for player names in Game History, while keeping truncation and responsive behavior tidy.
- Replace the nested link-button treatment with a direct styled player link in both tables so names keep the green hover state without ever gaining an underline.
- Keep the larger Ranking avatar and bring the Achievements avatar up to the same size and border treatment.
- Add the same compact icon-only Verified/Unverified badge beside each name in Player Achievements, using `user_id` as the existing verification signal.

## Achievement table consistency
- Make the sortable Count heading use exactly the same shared header control styling as Points, including a subtle primary-green text/background hover state.
- Normalize the Achievements column heading through the shared table-header class so its font size, weight, casing, spacing, and alignment match every other heading.
- Restyle each trophy-count value to match the Points value badge rather than the current generic secondary badge.
- Preserve the full achievement list in the Achievements column; the three-trophy cap applies only to the compact second row in Player Ranking.

## Shared styling and verification
- Update the shared table sort token so both tables receive the same green hover feedback, avoiding one-off styling.
- Verify the two tables at desktop and mobile widths, checking avatar/name alignment, icon-only verification badges, three-trophy cap, no link underlines, consistent headers, and horizontal overflow.

## Technical scope
Frontend presentation only: `PlayerTable`, `AchievementsTable`, and the shared table style tokens. No achievement, verification, sorting, or season data logic changes.
