# MVP voting reminders in the Telegram group

Email isn't possible yet — sending real emails needs a sender domain you own, and none is set up for this project. The same nudges work today through the Telegram group, which already gets signup, game-full and result messages. If you later get a domain, the same reminder logic can be pointed at email as well.

## What gets sent

Two reminders per game, both to the group chat:

1. **Morning after the game** — voting is open, here's the link.
2. **24 hours before voting closes** (voting runs 72h from kickoff, so this lands 48h after kickoff) — last call.

Each message includes the fixture date, how many of the roster have voted so far (e.g. "8 of 14 voted"), and the clickable signup page link where voting happens. Individual votes stay secret — only the count is shown, exactly like on the page.

Skipped automatically when:
- Voting is already closed or a winner has been finalised.
- Nobody was on the roster.
- Everyone on the roster has already voted (the last-call message is pointless then).

Example:

```text
⭐ MVP VOTING OPEN
🗓️ Tuesday, Sep 15, 6:15 PM
🗳️ 8 of 14 voted
⏳ Closes in 24 hours — last call!
👉 https://random-forest-fc.lovable.app/signup/<game-id>
```

## Technical scope

- New edge function `mvp-vote-reminder`, `verify_jwt = false`, added to `supabase/config.toml`, run hourly by cron (same pattern as `check-low-signups`).
- Picks fixtures by narrow 30-minute windows to avoid duplicate sends from the hourly cron:
  - "morning after": fixtures whose kickoff was yesterday, fired in the window around 09:00 local time.
  - "last call": fixtures whose kickoff is 47h45m–48h15m in the past.
- Reads roster size from `games_schedule_signups` (non-dropout, within capacity — waitlist excluded, matching voting eligibility) and vote count from `mvp_votes`; skips when the ballot is closed/finalised or all voters have voted.
- Sends via the existing Telegram bot token/chat id secrets, reusing the `telegram-notify` message style with a new `mvp_vote_reminder` type.
- No schema change, no change to voting rules, windows, tallies or the +1 point logic.

## Not changing

Voting eligibility, the 72-hour window, tie handling, the MVP card UI, or any existing notification.
