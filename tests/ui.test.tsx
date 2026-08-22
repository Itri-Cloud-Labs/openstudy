import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { testRender } from '@opentui/react/test-utils';

import { Logo } from '../src/shared/ui/Logo.tsx';

describe('OpenTUI rendering', () => {
  it('logo renders the OpenStudy ASCII art', async () => {
    const setup = await testRender(<Logo />, { width: 40, height: 8 });
    try {
      await setup.renderOnce();
      const frame = setup.captureCharFrame();
      assert.match(frame, /___/);
      assert.match(frame, /\| \|/);
      assert.match(frame, /\|___\//);
    } finally {
      setup.renderer.destroy();
    }
  });
});
