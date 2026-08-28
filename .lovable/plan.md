# Collapse "Schedule New Game" into Schedule Management

Make the schedule admin tab behave exactly like the games admin tab: one card, a toolbar row with a count and an add button, and the creation form in a dialog.

## Changes

1. Remove the standalone "Schedule New Game" card at the top of the Schedule tab.
2. In the "Schedule Management" card, replace the plain count line with the same toolbar used by Game Management: a full-width row containing "Scheduled Games (N)" on the left and a primary "Schedule Game" button (plus icon, "Schedule" on mobile) on the right.
3. Clicking that button opens a dialog titled "Schedule New Game" with the four existing fields stacked vertically: date picker (Tuesdays highlighted, past dates disabled), kick-off time, pitch size, total cost — plus Cancel / "Schedule Game" footer buttons.
4. Reuse the identical field layout for the existing "Edit Scheduled Game" dialog so create and edit look the same.
5. Keep all current behaviour: defaults (next Tuesday, 18:15, small pitch, £98), Telegram new-game notification with signup URL, and toasts. After a successful create, reset the form back to those defaults and close the dialog.

## Technical notes

- File: `src/components/AdminScheduleManagement.tsx` only.
- Toolbar markup mirrors `AdminGameManagement.tsx`: `<div className="management-toolbar">` with `<h3 className="management-count">` and a `Dialog`/`DialogTrigger` wrapped `Button size="sm"`; card content switches to `CardContent className="p-0"` with the list body padded (`p-4 sm:p-6`) to match Game Management.
- Extract the four form fields into a small local subcomponent (or shared JSX block) parameterised by value/onChange handlers so the create and edit dialogs share one layout.
- Empty state text changes from "Create your first one above!" to wording matching the new button ("Schedule your first game to get started.").
