import { LOGO } from '../data';
import { cx } from './ui';

export function Logo({ animated = false, className }: { animated?: boolean; className?: string }) {
  return (
    <pre
      aria-hidden="true"
      className={cx('font-mono text-ghost leading-[1.2] [font-variant-ligatures:none]', className)}
    >
      {LOGO.map(([open, study], index) => (
        <span
          key={open}
          className={cx('block', animated && 'motion-safe:animate-print')}
          style={animated ? { animationDelay: `${620 + index * 55}ms` } : undefined}
        >
          {open}
          <b className="font-bold text-text">{study}</b>
        </span>
      ))}
    </pre>
  );
}
