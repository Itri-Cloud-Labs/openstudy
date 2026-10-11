import { useEffect, useRef, useState } from 'react';
import { COMMANDS, type Command, LANGUAGES, MATERIAL_FILES, PROVIDERS, REASONING, SUBJECTS } from '../data';
import { useStudy } from '../study';
import { Logo } from './Logo';
import { type ModalSpec, useModal } from './Modal';
import { Cursor, Prompt, Sep, Terminal } from './Terminal';
import { cx } from './ui';

type Picker = 'subjects' | 'models' | 'reasoning' | 'material' | 'language';

const HINTS: { picker: Picker; keys: string; label: string }[] = [
  { picker: 'subjects', keys: 'tab', label: 'subject' },
  { picker: 'models', keys: 'ctrl+m', label: 'model' },
  { picker: 'reasoning', keys: 'ctrl+r', label: 'reasoning' },
  { picker: 'material', keys: 'ctrl+f', label: 'material' },
  { picker: 'language', keys: 'ctrl+l', label: 'language' },
];

const COLUMN = 'w-[min(100%,78ch)]';

// Replica of HomeScreen.tsx. Nothing typed here is sent anywhere.
export function HomeTerminal({ captionId }: { captionId: string }) {
  const { state, modelLabel, set, startSession } = useStudy();
  const [modal, showModal] = useModal();
  const term = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);

  const menu =
    menuDismissed || !value.startsWith('/') || /\s/.test(value)
      ? null
      : COMMANDS.filter(command => command.name.startsWith(value.slice(1).toLowerCase()));
  const activeIndex = Math.min(menuIndex, Math.max(0, (menu?.length ?? 0) - 1));

  // Typing anywhere near the top of the page lands in the prompt, the way it would in a terminal.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.length !== 1 || event.key === ' ' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.activeElement !== document.body) return;
      const box = term.current?.getBoundingClientRect();
      if (!box || box.bottom < 80 || box.top > window.innerHeight) return;
      input.current?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const pickerSpec = (picker: Picker, returnFocus: HTMLElement | null): ModalSpec => {
    switch (picker) {
      case 'subjects':
        return {
          title: 'Select Subject',
          search: true,
          selected: SUBJECTS.findIndex(item => item.name === state.subject),
          items: SUBJECTS.map(item => ({ label: item.name, color: item.color })),
          onSelect: item => set({ subject: item.label }),
        };
      case 'models':
        return {
          title: 'Select Provider',
          selected: PROVIDERS.indexOf(state.provider),
          footRight: 'enter continue',
          items: PROVIDERS.map(label => ({ label, current: label === state.provider })),
          onSelect: item => set({ provider: item.label }),
        };
      case 'reasoning':
        return {
          title: modelLabel,
          sub: 'Select a reasoning level.',
          selected: REASONING.findIndex(item => item.value === state.reasoning),
          items: REASONING.map(item => ({ ...item, current: item.value === state.reasoning })),
          onSelect: item => set({ reasoning: item.value }),
        };
      case 'material':
        return {
          title: 'Add Material',
          sub: 'Choose where your document comes from.',
          footRight: 'enter continue',
          items: [
            { label: 'Material from computer', hint: 'Choose a local document', value: 'computer' },
            { label: 'Material from URL', hint: 'Download a document from the web', value: 'url' },
          ],
          onSelect: item => showModal(materialSpec(item.value === 'url'), returnFocus),
        };
      case 'language':
        return {
          title: 'Select Language',
          search: true,
          maxRows: 8,
          empty: 'No languages found',
          selected: LANGUAGES.indexOf(state.language),
          items: LANGUAGES.map(label => ({ label, current: label === state.language })),
          onSelect: item => set({ language: item.label }),
        };
    }
  };

  const materialSpec = (fromUrl: boolean): ModalSpec =>
    fromUrl
      ? {
          title: 'Add Material',
          message: 'The replica downloads nothing. In OpenStudy you paste a document URL here.',
        }
      : {
          title: 'Add Material',
          sub: '~/notes',
          selected: MATERIAL_FILES.findIndex(file => state.material === `notes/${file}`),
          items: MATERIAL_FILES.map(label => ({ label })),
          onSelect: file => set({ material: `notes/${file.label}` }),
        };

  const runCommand = (command: Command) => {
    setValue('');
    showModal({ title: `/${command.name}`, message: command.note }, input.current);
  };

  const submit = () => {
    const trimmed = value.trim();
    const typed = COMMANDS.find(command => trimmed === `/${command.name}`);

    if (menu?.length) runCommand(menu[activeIndex]);
    else if (typed) runCommand(typed);
    // The app keeps an enter-on-empty fallback for the models modal; see AGENTS.md on ctrl+m.
    else if (!trimmed) showModal(pickerSpec('models', input.current), input.current);
    else if (!menu) {
      setValue('');
      input.current?.blur();
      startSession();
    }
  };

  return (
    <Terminal ref={term} className="flex flex-col items-center px-[2ch] pt-[2.5lh] lg:min-h-[27lh] lg:pt-[3lh]">
      <Logo animated className="mb-[2lh] min-h-[7.2em] text-[length:min(1em,2.9cqw)]" />

      <Prompt
        id="home-input"
        label="Study prompt (replica, nothing is sent)"
        className={COLUMN}
        value={value}
        inputRef={input}
        inputProps={{
          role: 'combobox',
          enterKeyHint: 'go',
          'aria-controls': 'home-menu',
          'aria-expanded': menu !== null,
          'aria-describedby': captionId,
          onKeyDown: event => {
            if (!menu) return;
            if (event.key === 'Escape') setMenuDismissed(true);
            else if (event.key === 'ArrowDown' && menu.length) setMenuIndex((activeIndex + 1) % menu.length);
            else if (event.key === 'ArrowUp' && menu.length)
              setMenuIndex((activeIndex - 1 + menu.length) % menu.length);
            else return;
            event.preventDefault();
          },
        }}
        onChange={next => {
          setMenuDismissed(false);
          setValue(next);
        }}
        onSubmit={submit}
        placeholder={
          <>
            <Cursor>N</Cursor>ot sure what to ask ? Just say Hi and {modelLabel} will guide you
          </>
        }
        before={
          <div
            id="home-menu"
            role="listbox"
            aria-label="Slash commands"
            hidden={menu === null}
            className="absolute inset-x-0 bottom-full z-10 bg-panel px-[1ch] py-[1lh] shadow-[inset_1px_0_var(--color-rule),inset_-1px_0_var(--color-rule)]"
          >
            {menu?.map((command, index) => (
              // biome-ignore lint/a11y/useFocusableInteractive: focus stays in the prompt, which owns the arrow keys.
              <div
                key={command.name}
                role="option"
                aria-selected={index === activeIndex}
                className={cx(
                  'flex cursor-pointer gap-[2ch] px-[1ch]',
                  index === activeIndex ? 'bg-subject font-bold text-on-subject' : 'text-muted',
                )}
                onMouseDown={event => {
                  event.preventDefault();
                  runCommand(command);
                }}
              >
                <b className={cx('w-[10ch] flex-none', index !== activeIndex && 'text-text')}>/{command.name}</b>
                <span>{command.description}</span>
              </div>
            ))}
            {menu?.length === 0 && <div className="px-[1ch] text-muted">No matching commands</div>}
          </div>
        }
      >
        <div aria-hidden="true" className="mt-[1lh] flex flex-wrap text-muted">
          <span className="font-bold text-subject-text">{state.subject}</span>
          <Sep />
          <span>{modelLabel}</span>
          <Sep />
          <span className="font-bold text-amber">{state.reasoning}</span>
          <Sep />
          <span>{state.material}</span>
          <Sep />
          <span>{state.language}</span>
        </div>
      </Prompt>

      <div
        className={cx(
          COLUMN,
          'mt-[0.75lh] flex flex-wrap justify-start gap-x-[1ch] gap-y-[0.25lh] lg:justify-end lg:gap-x-[1.5ch] lg:gap-y-0',
        )}
      >
        {HINTS.map(hint => (
          <button
            key={hint.picker}
            type="button"
            className="min-h-[2lh] text-faint transition-colors duration-140 hover:text-text focus-visible:text-text lg:min-h-[1.75lh]"
            onClick={event => showModal(pickerSpec(hint.picker, event.currentTarget), event.currentTarget)}
          >
            <kbd className="text-text">{hint.keys}</kbd> {hint.label}
          </button>
        ))}
      </div>

      <p className={cx(COLUMN, 'mt-[1.5lh] text-faint')}>
        <span className="font-bold text-amber">
          <span className="mr-[1ch] inline-block size-[0.62em] rounded-full bg-current" />
          Tip
        </span>{' '}
        Type a topic and press enter to start a session.
      </p>

      <div aria-hidden="true" className="mt-auto flex w-full justify-between pt-[2lh] pb-[0.5lh] text-faint">
        <span>~/study</span>
        <span>0.1.0</span>
      </div>

      {modal}
    </Terminal>
  );
}
