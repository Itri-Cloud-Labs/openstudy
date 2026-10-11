import { Context } from './components/Context';
import { Hero } from './components/Hero';
import { Install } from './components/Install';
import { Keys } from './components/Keys';
import { Local } from './components/Local';
import { Logo } from './components/Logo';
import { Session } from './components/Session';
import { LINK } from './components/ui';
import { REPO_URL } from './data';

const NAV = [
  ['#context', 'Context'],
  ['#session', 'Modes'],
  ['#local', 'Local data'],
  ['#install', 'Install'],
];

export function App() {
  return (
    <>
      <a
        className="absolute -top-16 left-(--gutter) z-30 rounded-md bg-amber px-4 py-2.5 font-semibold text-bg focus:top-3"
        href="#main"
      >
        Skip to content
      </a>

      <header className="mx-auto flex w-(--page) items-center gap-10 py-7">
        <a className="font-bold text-[1.1875rem] tracking-[-0.01em]" href="#top" aria-label="OpenStudy home">
          <span className="font-medium text-muted">Open</span>Study
        </a>
        <nav aria-label="Sections" className="ml-auto hidden gap-7 lg:flex">
          {NAV.map(([href, label]) => (
            <a key={href} className="text-[0.9375rem] text-muted transition-colors hover:text-text" href={href}>
              {label}
            </a>
          ))}
        </nav>
        <a
          className="rounded-full border border-rule px-3.5 py-1.5 text-[0.9375rem] text-text transition-colors hover:border-amber hover:text-amber max-lg:ml-auto"
          href={REPO_URL}
        >
          GitHub
        </a>
      </header>

      <main id="main">
        <Hero />
        <Context />
        <Session />
        <Local />
        <Keys />
        <Install />
      </main>

      <footer className="mx-auto w-(--page) pt-[clamp(104px,14vw,200px)] pb-10">
        <Logo className="mb-[clamp(32px,5vw,56px)] text-[length:clamp(6px,2.55vw,30px)]" />
        <div className="flex flex-wrap justify-between gap-x-8 gap-y-3 border-rule-soft border-t pt-6 text-[0.9375rem] text-muted">
          <p>
            OpenStudy 0.1.0. Free software under the{' '}
            <a className={LINK} href={`${REPO_URL}/blob/main/LICENSE`}>
              GNU GPL v3.0
            </a>
            .
          </p>
          <p className="flex gap-6">
            <a className={LINK} href={REPO_URL}>
              Source
            </a>
            <a className={LINK} href={`${REPO_URL}/issues`}>
              Issues
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
