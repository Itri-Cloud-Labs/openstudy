import { cx, Heading, LEAD, SECTION } from './ui';

const TREE = [
  ['|-- config.json       ', 'provider choice and credentials'],
  ['|-- session.json      ', 'current study preferences'],
  ['|-- documents/        ', 'material downloaded from URLs'],
  ['`-- <session-id>/     ', 'one directory per saved session'],
];

const FACTS = [
  ['Existing login', 'Requests go through the Codex CLI or OpenCode you have already signed in to.'],
  [
    'No tools',
    'Provider requests run without tools. The Codex adapter also uses a read-only sandbox and never asks for approval to change files.',
  ],
  ['Free software', 'GPLv3. Read it, fork it, change it. External contributions are not being accepted yet.'],
];

export function Local() {
  return (
    <section
      id="local"
      className={cx(
        SECTION,
        'grid grid-cols-1 items-start gap-[clamp(32px,6vw,96px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]',
      )}
    >
      <div className="rounded-[10px] bg-panel p-[clamp(20px,3vw,36px)] lg:sticky lg:top-8">
        <pre className="scrollbar-thin overflow-x-auto font-mono text-[length:clamp(0.75rem,1.2vw,0.9375rem)] text-soft leading-[1.9]">
          <b className="text-amber">~/.openstudy/</b>
          {TREE.map(([entry, note]) => (
            <span key={entry}>
              {`\n${entry}`}
              <span className="text-muted max-sm:block max-sm:pl-[4ch]">{note}</span>
            </span>
          ))}
        </pre>
      </div>
      <div>
        <Heading>Your notes stay on your disk.</Heading>
        <p className={cx(LEAD, 'mt-5')}>
          Preferences, saved sessions, and downloaded documents live in one directory in your home folder. There is no
          OpenStudy account and no OpenStudy server.
        </p>
        <dl className="mt-9 border-rule-soft border-t">
          {FACTS.map(([title, body]) => (
            <div key={title} className="border-rule-soft border-b py-5">
              <dt className="font-semibold text-[1.1875rem]">{title}</dt>
              <dd className="mt-1 max-w-[50ch] text-soft">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
