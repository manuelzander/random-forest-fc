import { describe, it, expect } from 'vitest';
import { computeWaitlisted, slotLabels } from './roster';

const s = (drop = false) => ({ last_minute_dropout: drop });

describe('roster', () => {
  it('a dropout frees a playing place for the first waitlisted player', () => {
    const list = [s(), s(true), s(), s()]; // capacity 2
    expect(computeWaitlisted(list, 2)).toEqual([false, false, false, true]);
    expect(slotLabels(list, 2)).toEqual(['#1', '#2', '#3', 'W1']);
  });
});
