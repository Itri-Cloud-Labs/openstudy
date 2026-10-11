import { MODES } from '../data';
import { useStudy } from '../study';
import { SessionTerminal } from './SessionTerminal';
import { cx, Heading, Kbd, LEAD, SECTION } from './ui';

export function Session() {
  const { state, setMode } = useStudy();

  return (
    <section id="session" className={SECTION}>
      <div className="grid grid-cols-1 items-start gap-x-[clamp(28px,6vw,96px)] gap-y-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Heading className="col-start-1 mb-3">Summary mode works today.</Heading>
        <p className={cx(LEAD, 'col-start-1')}>
          Start a session and OpenStudy turns your material into structured study notes: headings, lists, tables, and
          code, rendered in the terminal and scrolled with the arrow keys.
        </p>
        <p className={cx(LEAD, 'col-start-1')}>
          Four more modes are in the interface and not wired up yet. <Kbd>ctrl+l</Kbd> already moves between them, so
          you can see where the project is going.
        </p>
        <ul
          aria-label="Study modes"
          className="mt-3 border-rule-soft border-t lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:self-end"
        >
          {MODES.map((mode, index) => {
            const active = index === state.mode;
            return (
              <li key={mode.label}>
                <button
                  type="button"
                  aria-pressed={active}
                  className={cx(
                    'flex w-full items-baseline justify-between gap-4 border-rule-soft border-b py-[13px] pr-1 text-left font-semibold text-[1.1875rem] motion-safe:[transition:color_160ms,padding-left_260ms_var(--ease-expo)]',
                    active ? 'pl-3.5 text-amber' : 'pl-1 text-soft hover:text-text',
                  )}
                  onClick={() => setMode(index)}
                >
                  {mode.label}
                  <small
                    className={cx('font-mono font-normal text-[0.75rem]', mode.works ? 'text-success' : 'text-muted')}
                  >
                    {mode.works ? 'works today' : 'not wired yet'}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <figure className="mt-[clamp(40px,6vw,72px)]">
        <SessionTerminal />
        <figcaption className="max-w-[62ch] pt-[18px] text-[0.9375rem] text-muted">
          Sample output for a notes file on sorting. The placeholder modes show exactly what the app shows.
        </figcaption>
      </figure>
    </section>
  );
}
