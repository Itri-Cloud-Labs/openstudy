import { useEffect, useRef, useState } from 'react';
import { MODES } from '../data';
import { reducedMotion, useStudy } from '../study';
import { useModal } from './Modal';
import { Cursor, Prompt, Terminal } from './Terminal';
import { cx } from './ui';

const TABLE = `Insertion  O(n²)       O(n²)       yes
Merge      O(n log n)  O(n log n)  yes
Quick      O(n log n)  O(n²)       no
Heap       O(n log n)  O(n log n)  no`;

const CODE = `for i in range(1, len(a)):
    key = a[i]
    j = i - 1
    while j >= 0 and a[j] > key:
        a[j + 1] = a[j]
        j -= 1
    a[j + 1] = key`;

const MD_H2 = 'mt-[1lh] font-bold text-amber';
const MD_P = 'max-w-[82ch]';
const MD_ITEM = 'pl-[2ch] -indent-[2ch]';
const SIDE_HEADING = 'mb-[1lh] font-bold text-[1em] text-amber';

// Sample output, styled like the app's markdown renderer.
function Summary() {
  return (
    <>
      <p className="font-bold text-amber uppercase">Sorting algorithms</p>
      <p aria-hidden="true" className="text-amber opacity-60">
        ------------------
      </p>
      <p className={cx(MD_P, 'mt-[1lh]')}>
        Sorting arranges items into a defined order. The right algorithm depends on input size, whether the data is
        already nearly sorted, and whether equal items must keep their original order.
      </p>
      <p className={MD_H2}>Key ideas</p>
      <ul>
        <li className={MD_ITEM}>- A stable sort keeps equal items in their original order.</li>
        <li className={MD_ITEM}>- An in-place sort needs only constant extra memory.</li>
        <li className={MD_ITEM}>- No comparison sort beats O(n log n) in the worst case.</li>
      </ul>
      <p className={MD_H2}>Comparison</p>
      <pre className="scrollbar-thin overflow-x-auto">
        <b className="text-amber">{'Algorithm  Average     Worst       Stable\n'}</b>
        {TABLE}
      </pre>
      <p className={MD_H2}>Insertion sort</p>
      <p className={MD_P}>
        Builds the sorted list one item at a time by shifting larger items to the right. Fast on small or nearly sorted
        input.
      </p>
      <pre className="scrollbar-thin mt-[1lh] overflow-x-auto text-code">
        <i className="text-muted not-italic">{'python\n'}</i>
        {CODE}
      </pre>
      <p className={MD_H2}>Merge sort</p>
      <p className={MD_P}>
        Splits the list in half, sorts each half, then merges the two sorted halves. Predictable O(n log n), at the cost
        of O(n) extra memory.
      </p>
      <p className={MD_H2}>Remember</p>
      <ul>
        <li className={MD_ITEM}>- Nearly sorted data: insertion sort.</li>
        <li className={MD_ITEM}>- Stability required: merge sort.</li>
        <li className={MD_ITEM}>- Tight memory: heap sort.</li>
      </ul>
    </>
  );
}

function Generating() {
  const [frame, setFrame] = useState(2);

  useEffect(() => {
    if (reducedMotion.matches) return;
    const timer = window.setInterval(() => setFrame(current => current + 1), 450);
    return () => window.clearInterval(timer);
  }, []);

  return <p>Generating summary{'.'.repeat((frame % 3) + 1)}</p>;
}

// Replica of SessionScreen.tsx.
export function SessionTerminal() {
  const { state, sessionTerm, setMode } = useStudy();
  const [modal, showModal] = useModal();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const mode = MODES[state.mode];
  const isSummary = state.mode === 0;

  const settings = [
    ['Subject', state.subject],
    ['Provider', state.provider],
    ['Model', state.model],
    ['Reasoning', state.reasoning],
    ['Material', state.material],
    ['Language', state.language],
  ];

  return (
    <Terminal ref={sessionTerm} className="flex h-[30lh] lg:h-[31lh]">
      <div className="flex min-w-0 flex-1 flex-col px-[2ch] py-[1lh]">
        {isSummary && (
          <div className="my-[1lh] flex justify-between">
            <strong>{mode.label}</strong>
            <span role="status" className="text-muted">
              {state.summary === 'loading' ? 'loading' : 'up/down scroll'}
            </span>
          </div>
        )}
        <div
          key={`${state.mode}-${state.summary}`}
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-[2ch] [scrollbar-color:var(--color-amber)_transparent] focus-visible:outline-offset-0 motion-safe:animate-fade"
        >
          {!isSummary ? (
            <p className="text-muted">{mode.label}</p>
          ) : state.summary === 'loading' ? (
            <Generating />
          ) : (
            <Summary />
          )}
        </div>

        <Prompt
          id="session-input"
          label="Follow-up prompt (replica)"
          className="mt-[1lh] flex-none"
          value={value}
          inputRef={input}
          onChange={setValue}
          onSubmit={() => {
            if (!value.trim()) return;
            setValue('');
            showModal(
              { title: 'Session Prompt', message: 'Follow-up prompts are not wired to study modes yet.' },
              input.current,
            );
          }}
          placeholder={
            <>
              <Cursor>A</Cursor>sk anything...
            </>
          }
        />
        <div aria-hidden="true" className="text-right text-muted">
          ctrl+c exit
        </div>
      </div>

      {/* The app drops the sidebar on narrow terminals; so does the replica. */}
      <aside
        aria-label="Session details"
        className="flex w-[42ch] flex-none flex-col bg-panel py-[1lh] pr-[3ch] pl-[2ch] @max-[880px]:hidden"
      >
        <h3 className={SIDE_HEADING}>Session</h3>
        <p className="font-bold">Sorting algorithms</p>
        <p className="text-muted">Local study session</p>

        <h3 className={cx(SIDE_HEADING, 'mt-[1lh]')}>Settings</h3>
        <dl>
          {settings.map(([label, setting]) => (
            <div key={label} className="flex justify-between gap-[2ch]">
              <dt className="text-muted">{label}</dt>
              <dd className={cx('truncate', label === 'Subject' && 'text-subject-text')}>{setting}</dd>
            </div>
          ))}
        </dl>

        <h3 className={cx(SIDE_HEADING, 'mt-[1lh]')}>Mode</h3>
        <ol>
          {MODES.map((item, index) => {
            const active = index === state.mode;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  aria-pressed={active}
                  className={cx(
                    'flex w-full justify-between px-[1ch]',
                    active ? 'bg-subject font-bold text-on-subject' : 'text-muted hover:text-text',
                  )}
                  onClick={() => setMode(index)}
                >
                  <span>{item.label}</span>
                  <span>{active && 'active'}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className="mt-[1lh] self-start text-muted hover:text-text"
          onClick={() => setMode(state.mode + 1)}
        >
          <kbd>ctrl+l</kbd> next mode
        </button>

        <p className="mt-auto text-muted">
          <span className="text-success">*</span> dir: ~/study
          <br />
          OpenStudy 0.1.0
        </p>
      </aside>

      {modal}
    </Terminal>
  );
}
