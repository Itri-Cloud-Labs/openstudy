import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { testRender } from '@opentui/react/test-utils';

import { HomeScreen } from '../src/features/home/HomeScreen.tsx';
import { render as renderMessage } from '../src/modals/message.tsx';
import type { ModalRenderContext } from '../src/modals/types.ts';
import { Logo } from '../src/shared/ui/Logo.tsx';
import { PromptInput } from '../src/shared/ui/PromptInput.tsx';

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

  it('keeps modal headers and footers on one row', async () => {
    const node = renderMessage({
      modal: { id: 'message', title: 'Notice', message: 'Body' },
      context: { selectedSubject: null } as ModalRenderContext,
    });
    const setup = await testRender(node, { width: 60, height: 8 });

    try {
      await setup.renderOnce();
      const frame = setup.captureCharFrame();
      assert.match(frame, /^Notice\s+esc/m);
      assert.match(frame, /^\s+ok\s*$/m);
    } finally {
      setup.renderer.destroy();
    }
  });

  it('centers the home content at wide terminal sizes', async () => {
    const noop = () => {};
    const setup = await testRender(
      <HomeScreen
        width={120}
        height={30}
        promptWidth={100}
        presentation={{
          subject: 'Mathematics',
          subjectColor: '#3b82f6',
          provider: 'codex',
          modelProvider: 'codex',
          model: 'gpt-test',
          modelLabel: 'gpt-test',
          reasoningEffort: 'medium',
          material: 'No material',
          materialPath: '',
          studyLanguage: 'English',
          cwd: '/tmp/project',
          tip: 'Type a topic and press enter.',
        }}
        input={{
          commands: [],
          commandContext: { onExit: noop, onSetup: noop, openModal: noop, closeModal: noop },
          active: false,
          triggers: [],
          onTrigger: noop,
          onSubmit: noop,
        }}
        overlay={{ modal: null, context: {} as ModalRenderContext }}
      />,
      { width: 120, height: 30 },
    );

    try {
      await setup.renderOnce();
      const contextLine = setup
        .captureCharFrame()
        .split('\n')
        .find(line => line.includes('Mathematics'));
      assert.ok(contextLine);
      assert.equal(contextLine.indexOf('Mathematics'), 13);
    } finally {
      setup.renderer.destroy();
    }
  });

  it('accepts bracketed paste in the prompt', async () => {
    const noop = () => {};
    const setup = await testRender(
      <PromptInput
        onSubmit={noop}
        commands={[]}
        commandContext={{ onExit: noop, onSetup: noop, openModal: noop, closeModal: noop }}
        width={50}
        inputActive
        modalTriggers={[]}
        onModalTrigger={noop}
        placeholder="Ask anything"
      />,
      { width: 60, height: 8 },
    );

    try {
      await setup.renderOnce();
      await setup.mockInput.pasteBracketedText('PASTED TEXT');
      await new Promise(resolve => setTimeout(resolve, 10));
      await setup.renderOnce();
      assert.match(setup.captureCharFrame(), /PASTED TEXT/);
    } finally {
      setup.renderer.destroy();
    }
  });
});
