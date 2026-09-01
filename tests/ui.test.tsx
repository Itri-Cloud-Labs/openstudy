import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { testRender } from '@opentui/react/test-utils';

import { HomeScreen } from '../src/features/home/HomeScreen.tsx';
import { SetupScreen } from '../src/features/setup/SetupScreen.tsx';
import { QuizMode } from '../src/features/study-session/modes/quiz/QuizMode.tsx';
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

  it('preserves the setup wizard spacing', async () => {
    const setup = await testRender(<SetupScreen onExit={() => {}} />, { width: 73, height: 23 });

    try {
      await setup.renderOnce();
      const lines = setup.captureCharFrame().split('\n');
      const divider = lines.findIndex(line => line.includes('────'));
      const welcome = lines.findIndex(line => line.includes("Welcome! Let's set up"));
      const description = lines.findIndex(line => line.includes('This wizard will configure'));
      assert.equal(welcome - divider, 2);
      assert.equal(description - welcome, 2);
    } finally {
      setup.renderer.destroy();
    }
  });

  it('exits setup with ctrl+c', async () => {
    let exited = false;
    const setup = await testRender(<SetupScreen onExit={() => (exited = true)} />, { width: 73, height: 23 });

    try {
      await setup.renderOnce();
      setup.mockInput.pressCtrlC();
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(exited, true);
    } finally {
      setup.renderer.destroy();
    }
  });

  it('positions slash command suggestions above the prompt', async () => {
    const noop = () => {};
    const commands = [
      { config: { name: 'exit', description: 'Exit the cli' }, execute: noop },
      { config: { name: 'sessions', description: 'Open saved sessions' }, execute: noop },
      { config: { name: 'setup', description: 'Start setup' }, execute: noop },
    ];
    const setup = await testRender(
      <box style={{ flexDirection: 'column', width: 60, height: 12 }}>
        <box style={{ height: 6, flexShrink: 0 }} />
        <PromptInput
          onSubmit={noop}
          commands={commands}
          commandContext={{ onExit: noop, onSetup: noop, openModal: noop, closeModal: noop }}
          width={50}
          inputActive
          modalTriggers={[]}
          onModalTrigger={noop}
          placeholder="Ask anything"
        />
      </box>,
      { width: 60, height: 12 },
    );

    try {
      await setup.renderOnce();
      await setup.mockInput.typeText('/');
      await new Promise(resolve => setTimeout(resolve, 10));
      await setup.renderOnce();
      const lines = setup.captureCharFrame().split('\n');
      const lastSuggestionRow = lines.findIndex(line => line.includes('/setup'));
      const promptRow = lines.findIndex(
        (line, index) => index > lastSuggestionRow && line.includes('/') && !line.includes('/setup'),
      );
      assert.ok(lastSuggestionRow >= 0);
      assert.ok(promptRow > lastSuggestionRow);
    } finally {
      setup.renderer.destroy();
    }
  });

  it('runs a quiz question through answer feedback and completion', async () => {
    const setup = await testRender(
      <QuizMode
        contentWidth={60}
        contentHeight={14}
        inputActive
        commandMenuActive={false}
        quizState={{
          status: 'ready',
          quiz: {
            questions: [
              {
                question: 'Which structure stores genetic information?',
                choices: ['Cell wall', 'DNA', 'Water', 'Glucose'],
                correctIndex: 1,
                explanation: 'DNA stores hereditary information.',
              },
            ],
          },
        }}
      />,
      { width: 60, height: 14 },
    );

    try {
      await setup.renderOnce();
      assert.match(setup.captureCharFrame(), /> 1\. Cell wall/);
      await new Promise(resolve => setTimeout(resolve, 20));

      await setup.mockInput.typeText('2');
      await new Promise(resolve => setTimeout(resolve, 20));
      await setup.renderOnce();
      assert.match(setup.captureCharFrame(), /> 2\. DNA/);

      await setup.mockInput.pressKeys(['RETURN']);
      await new Promise(resolve => setTimeout(resolve, 20));
      await setup.renderOnce();
      const feedbackFrame = setup.captureCharFrame();
      assert.match(feedbackFrame, /Correct\./);
      assert.match(feedbackFrame, /DNA stores hereditary information/);

      await setup.mockInput.pressKeys(['RETURN']);
      await new Promise(resolve => setTimeout(resolve, 20));
      await setup.renderOnce();
      const completeFrame = setup.captureCharFrame();
      assert.match(completeFrame, /1 \/ 1/);
      assert.match(completeFrame, /Perfect score\./);
    } finally {
      setup.renderer.destroy();
    }
  });
});
