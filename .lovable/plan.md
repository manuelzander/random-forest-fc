

## Plan: Add Display Name Change to Account Settings

### What Changes

**1. Update `AccountDetailsEditor.tsx`**
- Add new props: `playerName` (current player name) and `onNameUpdate` callback
- Add a "Display Name" input field at the top of the Account Settings card (before the credit section)
- On save, update both `players.name` (WHERE `user_id = current user`) and `profiles.display_name` (WHERE `user_id = current user`)
- Validation: non-empty, trimmed, max 50 characters

**2. Update `StreamlinedProfile.tsx`**
- Pass `playerName={currentUserPlayer?.name}` and `onNameUpdate={fetchPlayers}` to `AccountDetailsEditor`

### Technical Details

- The `players` table RLS already allows users to update their claimed player (`auth.uid() = user_id`)
- The `profiles` table RLS already allows users to update their own profile (`auth.uid() = user_id`)
- No database migration needed
- After update, call both `onNameUpdate` and `onCreditUpdate` to refresh parent data so the name change reflects immediately in the UI

### Safety

All game history, signups, and debt use player UUIDs -- no impact from name changes. Leaderboards auto-update since they query `players.name` dynamically.

