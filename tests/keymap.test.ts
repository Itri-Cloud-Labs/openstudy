import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KeyEvent, parseKeypress } from '@opentui/core';

import { toAppKeyEvent } from '../src/shared/terminal/keymap.ts';

describe('OpenTUI key mapping', () => {
  it('preserves printable characters outside the BMP', () => {
    const parsed = parseKeypress('😀');
    assert.ok(parsed);
    assert.equal(toAppKeyEvent(new KeyEvent(parsed)).input, '😀');
  });
});
