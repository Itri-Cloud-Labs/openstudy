import { type ReactNode, useState } from 'react';
import { SUBJECTS } from '../data';
import { useStudy } from '../study';
import { Sep } from './Terminal';
import { cx, Kbd, SECTION, SectionHead } from './ui';

type Part = 'subject' | 'model' | 'reasoning' | 'material' | 'language';

const BODY = 'max-w-[58ch] text-soft';
const VALUES = 'mt-3 max-w-[58ch] font-mono text-[0.8125rem] text-muted leading-[1.7]';

export function Context() {
  const { state, modelLabel, set } = useStudy();
  const [active, setActive] = useState<Part | null>(null);

  const tokens: [Part, string][] = [
    ['subject', state.subject],
    ['model', modelLabel],
    ['reasoning', state.reasoning],
    ['material', state.material],
    ['language', state.language],
  ];

  const part = (name: Part, keys: string, title: string, children: ReactNode) => (
    // biome-ignore lint/a11y/noStaticElementInteractions: hovering a row only highlights its token in the decorative line above.
    <div
      className="group grid grid-cols-1 gap-x-[clamp(20px,5vw,72px)] gap-y-3 border-rule-soft border-b py-[30px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]"
      onPointerEnter={() => setActive(name)}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive(name)}
      onBlur={() => setActive(null)}
    >
      <dt className="flex items-baseline gap-[18px] font-semibold text-[1.5rem] tracking-[-0.01em]">
        <Kbd className="min-w-[4.6rem] flex-none text-center font-normal text-[0.8125rem] tracking-normal transition-colors duration-200 group-focus-within:border-amber group-focus-within:text-amber group-hover:border-amber group-hover:text-amber">
          {keys}
        </Kbd>
        <span>{title}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );

  return (
    <section id="context" className={SECTION}>
      <SectionHead title="Five things a session knows before you ask.">
        The line under the prompt is the whole configuration. Each part has one key, and OpenStudy remembers your
        choices between launches.
      </SectionHead>

      <div className="mt-[clamp(40px,6vw,72px)]">
        <div
          aria-hidden="true"
          className="sticky top-0 z-10 flex flex-wrap bg-raised py-[1.5em] pr-[1.75em] pl-[2.35em] font-mono text-[length:clamp(0.8125rem,2.05vw,1.5rem)] text-muted shadow-[inset_0.6em_0_var(--subject)]"
        >
          {tokens.map(([name, token], index) => (
            <span key={name} className="contents">
              {index > 0 && <Sep />}
              <span
                className={cx(
                  'transition-[color,opacity] duration-200',
                  name === 'subject' && 'font-bold text-subject-text',
                  name === 'reasoning' && 'font-bold text-amber',
                  active && active !== name && 'opacity-35',
                  active === name && name !== 'subject' && name !== 'reasoning' && 'text-text',
                )}
              >
                {token}
              </span>
            </span>
          ))}
        </div>

        <dl>
          {part(
            'subject',
            'tab',
            'Subject',
            <>
              <p className={BODY}>
                Eight subjects, each with a color. The color marks your prompt and every selection you make.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUBJECTS.map(subject => {
                  const pressed = subject.name === state.subject;
                  return (
                    <button
                      key={subject.name}
                      type="button"
                      aria-pressed={pressed}
                      className={cx(
                        'inline-flex min-h-[34px] items-center gap-[9px] rounded-full border pr-[13px] pl-[11px] font-mono text-[0.8125rem] transition-colors',
                        pressed
                          ? 'border-text bg-panel text-text'
                          : 'border-rule text-soft hover:border-muted hover:text-text',
                      )}
                      onClick={() => set({ subject: subject.name })}
                    >
                      <span
                        className="size-[9px] rounded-full shadow-[0_0_0_1px_rgb(255_255_255/0.14)]"
                        style={{ background: subject.color }}
                      />
                      {subject.name}
                    </button>
                  );
                })}
              </div>
            </>,
          )}
          {part(
            'model',
            'ctrl+m',
            'Model',
            <p className={BODY}>
              Codex or OpenCode, through the login already on your machine. The model list comes from the provider, so
              it is always the one your account can use.
            </p>,
          )}
          {part(
            'reasoning',
            'ctrl+r',
            'Reasoning',
            <p className={BODY}>
              Reasoning levels are read from the selected model. You only see the levels it supports.
            </p>,
          )}
          {part(
            'material',
            'ctrl+f',
            'Material',
            <>
              <p className={BODY}>
                A document from your home directory, or one downloaded from a URL (25 MB limit) into{' '}
                <code className="text-[0.8125em] text-code">~/.openstudy/documents</code>.
              </p>
              <p className={VALUES}>
                PDF, EPUB, Markdown, plain text, Office, OpenDocument, CSV, JSON, XML, YAML, LaTeX
              </p>
            </>,
          )}
          {part(
            'language',
            'ctrl+l',
            'Language',
            <>
              <p className={BODY}>The language you want to study in, whatever language the material is written in.</p>
              <p className={VALUES}>
                English, Spanish, French, German, Italian, Portuguese, Arabic, Chinese, Japanese, Korean, Hindi, Dutch,
                Russian, Turkish
              </p>
            </>,
          )}
        </dl>
      </div>
    </section>
  );
}
