import { describe, expect, test } from 'bun:test';

import { createRematchRequestInbox } from '@/game/session/rematch';

describe('online rematch requests', () => {
  test('accepts each request only once', () => {
    const inbox = createRematchRequestInbox();

    expect(inbox.receive({ type: 'rematch-request', id: 10 })).toBe(true);
    expect(inbox.receive({ type: 'rematch-request', id: 10 })).toBe(false);
    expect(inbox.receive({ type: 'rematch-request', id: 9 })).toBe(false);
    expect(inbox.receive({ type: 'rematch-request', id: 11 })).toBe(true);
  });
});
