import { REPO_URL } from '../data';
import { HomeTerminal } from './HomeTerminal';
import { Kbd } from './ui';

const LINE = 'block motion-safe:animate-rise';

export function Hero() {
  return (
    <section id="top" className="mx-auto w-(--page) pt-[clamp(32px,5vw,72px)]">
      <div className="grid grid-cols-1 items-end gap-[clamp(28px,5vw,72px)] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <h1 className="font-semibold text-[length:clamp(2.75rem,7.4vw,5.75rem)] leading-[0.96] tracking-[-0.035em]">
          <span className={LINE}>Study with an AI</span>
          <span className={`${LINE} [animation-delay:70ms]`}>without leaving</span>
          <span className={`${LINE} text-amber [animation-delay:140ms]`}>your terminal.</span>
        </h1>
        <div className="pb-2 motion-safe:animate-rise [animation-delay:260ms]">
          <p className="max-w-[40ch] text-pretty text-soft">
            OpenStudy is a keyboard-first study assistant. Tell it your subject, model, reasoning level, source
            material, and language once. After that, a prompt is all it needs.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3.5">
            <a
              className="inline-block rounded-lg bg-amber px-[22px] py-[13px] font-bold text-bg hover:-translate-y-px hover:bg-amber-bright active:translate-y-0 motion-safe:[transition:background-color_160ms,translate_160ms_var(--ease-expo)]"
              href="#install"
            >
              Install OpenStudy
            </a>
            <a
              className="font-semibold underline decoration-1 decoration-amber underline-offset-[6px] transition-colors hover:text-amber"
              href={REPO_URL}
            >
              Read the source
            </a>
          </div>
        </div>
      </div>

      <figure className="mt-[clamp(40px,5vw,72px)] motion-safe:animate-stage-in">
        <HomeTerminal captionId="home-caption" />
        <figcaption id="home-caption" className="relative pt-[18px] text-[0.9375rem] text-muted">
          <span
            aria-hidden="true"
            className="desk-glow pointer-events-none absolute top-0 left-1/2 -z-1 h-[200px] w-[min(100vw,1180px)] -translate-x-1/2"
          />
          A working replica of the home screen. Type <Kbd>Hi</Kbd> and press enter, or use the key hints. Nothing you
          type leaves this page.
        </figcaption>
      </figure>
    </section>
  );
}
