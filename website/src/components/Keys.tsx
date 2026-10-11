import { Kbd, SECTION, SectionHead } from './ui';

const KEYS = [
  ['enter', 'Start a session', 'Submit the prompt'],
  ['tab', 'Choose a subject', ''],
  ['ctrl+m', 'Choose a model', ''],
  ['ctrl+r', 'Choose reasoning effort', ''],
  ['ctrl+f', 'Choose study material', ''],
  ['ctrl+l', 'Choose a language', 'Move to the next study mode'],
  ['ctrl+c', 'Close a modal or exit', 'Close a modal or exit'],
];

const COMMANDS = [
  ['/setup', 'Open provider setup.'],
  ['/sessions', 'Open saved sessions.'],
  ['/exit', 'Close OpenStudy.'],
];

const CELL = 'border-b py-[13px] pr-2.5 text-left font-normal sm:pr-4';
const HEAD = `${CELL} border-rule text-[0.875rem] text-muted`;
const BODY = `${CELL} border-rule-soft text-[0.9375rem] sm:text-[1rem]`;
const ACTION = `${BODY} text-soft group-hover:text-text`;

export function Keys() {
  return (
    <section id="keys" className={SECTION}>
      <SectionHead title="The whole interface fits in a table.">
        Seven keys and three slash commands. Slash commands work in both prompts.
      </SectionHead>
      <div className="mt-[clamp(36px,5vw,64px)] grid grid-cols-1 items-start gap-x-[clamp(20px,5vw,72px)] gap-y-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={HEAD}>
                  Key
                </th>
                <th scope="col" className={HEAD}>
                  Home screen
                </th>
                <th scope="col" className={HEAD}>
                  Study session
                </th>
              </tr>
            </thead>
            <tbody>
              {KEYS.map(([key, home, session]) => (
                <tr key={key} className="group transition-[background-color] duration-140 hover:bg-panel">
                  <th scope="row" className={BODY}>
                    <Kbd>{key}</Kbd>
                  </th>
                  <td className={ACTION}>{home}</td>
                  <td className={ACTION}>{session || <span className="sr-only">No action</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="border-rule border-t">
          {COMMANDS.map(([command, description]) => (
            <div key={command} className="flex items-baseline gap-5 border-rule-soft border-b py-[13px]">
              <dt className="w-[6.5rem] flex-none">
                <code className="text-[0.9375rem] text-amber">{command}</code>
              </dt>
              <dd className="text-soft">{description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
