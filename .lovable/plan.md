# Next / Last Game Card Cleanup

## Changes

1. Last Game card
   - Drop the "Result" label.
   - Show the scoreline as `3 vs 2` (word "vs", not a dash), matching the Game History tab.
   - Colour the scores: winning (or drawing) side in primary green, losing side muted — same rule as Game History.

2. Shared alignment between the two cards
   - Both cards keep the same vertical rhythm: kicker + date headline, meta line (time • players • MVP), then a bottom block of equal height (signup progress bar vs scoreline).
   - Actions move to a consistent footer row pinned to the card bottom, so "View Schedule" and "View Games" sit on the same baseline instead of floating at different heights.
   - Buttons become quieter: small, ghost-style text links with a chevron rather than outlined pills, so the cards read as summaries and the numbers stay the hero.

3. Small extras
   - Next Game card: keep pitch size + relative time in the meta line, unchanged.
   - Empty states keep the same footer placement so cards never shift height.

## Technical details

- Edit `src/components/HomepageStatsCards.tsx` only.
- Score colouring copies the existing logic from `GamesList.tsx`: `team1_goals >= team2_goals ? text-primary : text-muted-foreground` and vice versa.
- Card body becomes `flex flex-col` with a `mt-auto` footer for the action button; both cards use identical wrappers.
- No data/query changes, no design token changes, no hardcoded colours.

## Validation

- Check the homepage in live and archived season modes and at mobile width; confirm both cards align and the build log is clean.
