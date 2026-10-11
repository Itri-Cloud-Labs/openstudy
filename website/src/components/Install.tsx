import { type ReactNode, useEffect, useRef, useState } from 'react';
import { REPO_URL } from '../data';
import { cx, Kbd, LINK, SECTION, SectionHead } from './ui';

const PROVIDERS = [
  { id: 'codex', label: 'Codex', command: 'codex login' },
  { id: 'opencode', label: 'OpenCode', command: 'opencode auth login' },
];

const CLONE = `git clone ${REPO_URL}.git
cd openstudy
bun install --frozen-lockfile
npm run dev`;

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_LABEL: Record<CopyState, string> = { idle: 'Copy', copied: 'Copied', failed: 'Select it' };

function CodeBlock({ code, ...panel }: { code: string; id?: string; role?: 'tabpanel'; 'aria-labelledby'?: string }) {
  const [copy, setCopy] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopy('idle'), 1600);
  };

  return (
    <div {...panel} className="flex items-start rounded-[10px] bg-panel">
      <pre className="code-block scrollbar-thin min-w-0 flex-1 overflow-x-auto p-[18px] sm:px-[22px] sm:py-5">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        aria-live="polite"
        className={cx(
          'mt-3 mr-3 min-w-[68px] flex-none rounded-md border bg-panel px-3 py-1.5 font-mono text-[0.75rem] transition-colors',
          copy === 'copied'
            ? 'border-success text-success'
            : 'border-rule text-muted hover:border-muted hover:text-text',
        )}
        onClick={onCopy}
      >
        {COPY_LABEL[copy]}
      </button>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-1 gap-x-[clamp(20px,5vw,72px)] border-rule-soft border-t py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
      <h3 className="mb-4 font-semibold text-[1.5rem] leading-[1.2] tracking-[-0.01em] lg:mb-0">
        <span
          aria-hidden="true"
          className="inline-block w-[2.2rem] font-mono font-normal text-[0.875rem] text-amber tracking-normal"
        >
          {number}
        </span>
        {title}
      </h3>
      <div className="min-w-0 space-y-4">{children}</div>
    </li>
  );
}

function Requirement({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-[22px] text-soft">
      <span aria-hidden="true" className="absolute top-[0.7em] left-0.5 size-[7px] rounded-full bg-rule" />
      {children}
    </li>
  );
}

export function Install() {
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <section id="install" className={SECTION}>
      <SectionHead title="Run it from source.">
        OpenStudy is a young project at version 0.1.0. There is no packaged release yet, so installing means cloning the
        repository.
      </SectionHead>

      <ol className="mt-[clamp(36px,5vw,64px)]">
        <Step number={1} title="Check what you have">
          <ul className="space-y-1.5">
            <Requirement>
              <a className={LINK} href="https://bun.sh">
                Bun
              </a>{' '}
              1.3 or newer
            </Requirement>
            <Requirement>npm 10 or newer</Requirement>
            <Requirement>A terminal at least 73 columns wide and 23 rows tall</Requirement>
            <Requirement>
              The{' '}
              <a className={LINK} href="https://github.com/openai/codex">
                Codex CLI
              </a>{' '}
              or{' '}
              <a className={LINK} href="https://opencode.ai">
                OpenCode
              </a>
            </Requirement>
          </ul>
        </Step>
        <Step number={2} title="Sign in to a provider">
          <div role="tablist" aria-label="Provider" className="flex gap-1">
            {PROVIDERS.map((item, index) => {
              const selected = item === provider;
              return (
                <button
                  key={item.id}
                  ref={node => {
                    tabs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-controls={`panel-${item.id}`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className={cx(
                    'rounded-full border px-3.5 py-1.5 text-[0.9375rem] transition-colors',
                    selected ? 'border-rule text-text' : 'border-transparent text-muted hover:text-text',
                  )}
                  onClick={() => setProvider(item)}
                  onKeyDown={event => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                    const step = event.key === 'ArrowRight' ? 1 : -1;
                    const next = (index + step + PROVIDERS.length) % PROVIDERS.length;
                    setProvider(PROVIDERS[next]);
                    tabs.current[next]?.focus();
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <CodeBlock
            key={provider.id}
            code={provider.command}
            role="tabpanel"
            id={`panel-${provider.id}`}
            aria-labelledby={`tab-${provider.id}`}
          />
        </Step>
        <Step number={3} title="Clone and start">
          <CodeBlock code={CLONE} />
          <p className="max-w-[56ch] text-soft">
            The first launch opens setup. Choose a provider, fill in the session options, and if you have no prompt in
            mind, type <Kbd>Hi</Kbd>.
          </p>
        </Step>
      </ol>
    </section>
  );
}
