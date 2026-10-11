import type { ReactNode } from 'react';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export const SECTION = 'mx-auto w-(--page) pt-[clamp(104px,14vw,200px)]';
export const LEAD = 'max-w-[46ch] text-pretty text-soft';
export const LINK =
  'underline decoration-muted underline-offset-4 transition-[color,text-decoration-color] hover:text-amber hover:decoration-amber';

export function Kbd({ className = 'text-[0.8125em]', children }: { className?: string; children: ReactNode }) {
  return (
    <kbd
      className={cx(
        'whitespace-nowrap rounded-sm border border-rule bg-panel px-[0.5em] py-[0.15em] text-text',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Heading({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h2
      className={cx(
        'text-balance font-semibold text-[length:clamp(2rem,4.2vw,3.25rem)] leading-[1.04] tracking-[-0.025em]',
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function SectionHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-end gap-[clamp(20px,5vw,72px)] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Heading>{title}</Heading>
      <p className={LEAD}>{children}</p>
    </div>
  );
}
