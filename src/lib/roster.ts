/**
 * Waitlist status for an ordered signup list. A last-minute dropout keeps their
 * slot (and still pays), but frees a playing place: the playing roster is the
 * first `capacity` non-dropout signups. Anyone active beyond that is waitlisted.
 */
export function computeWaitlisted<T extends { last_minute_dropout?: boolean | null }>(
  signups: T[],
  capacity: number,
): boolean[] {
  let active = 0;
  return signups.map((s) => {
    if (s.last_minute_dropout) return false;
    active += 1;
    return active > capacity;
  });
}

/** Label: waitlisted players get W1, W2…; everyone else keeps their signup number. */
export function slotLabels<T extends { last_minute_dropout?: boolean | null }>(
  signups: T[],
  capacity: number,
): string[] {
  const wl = computeWaitlisted(signups, capacity);
  let w = 0;
  return signups.map((_, i) => (wl[i] ? `W${++w}` : `#${i + 1}`));
}
