import { describe, expect, it } from 'vitest';
import { isEventContinuous } from '../../src/verification.js';

describe('event history continuity', () => {
  it('requires the first event to have no predecessor', () => {
    expect(isEventContinuous(0, null)).toBe(true);
    expect(isEventContinuous(0, '0xaltered')).toBe(false);
  });

  it('requires every later event to point to the exact previous hash', () => {
    expect(isEventContinuous(1, '0xprevious', '0xprevious')).toBe(true);
    expect(isEventContinuous(1, '0xaltered', '0xprevious')).toBe(false);
  });
});
