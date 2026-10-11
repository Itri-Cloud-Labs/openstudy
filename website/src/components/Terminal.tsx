import type { ComponentProps, ReactNode, Ref } from 'react';
import { cx } from './ui';

// Terminal replica. Units are character cells (ch) and rows (lh), like the TUI.
export function Terminal({
  ref,
  className,
  children,
}: {
  ref?: Ref<HTMLDivElement>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div ref={ref} className="@container overflow-hidden rounded-[10px] border border-rule bg-bg">
      <div
        className={cx(
          'relative font-mono text-[length:clamp(12px,1.42cqw,15px)] leading-normal [font-variant-ligatures:none]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Sep() {
  return <i className="mx-[1ch] text-rule not-italic">·</i>;
}

export function Cursor({ children }: { children: string }) {
  return <span className="motion-reduce:bg-text motion-reduce:text-raised motion-safe:animate-blink">{children}</span>;
}

interface PromptProps {
  id: string;
  label: string;
  value: string;
  placeholder: ReactNode;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  inputProps?: ComponentProps<'input'>;
  onChange: (value: string) => void;
  onSubmit: () => void;
  before?: ReactNode;
  children?: ReactNode;
}

// PromptInput.tsx: a raised row with a 1-cell subject rail.
export function Prompt({
  id,
  label,
  value,
  placeholder,
  className,
  inputRef,
  inputProps,
  onChange,
  onSubmit,
  before,
  children,
}: PromptProps) {
  return (
    <form
      autoComplete="off"
      className={cx(
        'relative flex bg-raised outline outline-transparent outline-offset-3 transition-[outline-color] focus-within:outline-[color-mix(in_oklab,var(--subject)_75%,var(--color-text))]',
        className,
      )}
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {before}
      <span aria-hidden="true" className="w-[1ch] flex-none bg-subject" />
      <div className="min-w-0 flex-1 px-[2ch] py-[1lh]">
        <div className="relative">
          <label className="sr-only" htmlFor={id}>
            {label}
          </label>
          <input
            {...inputProps}
            ref={inputRef}
            id={id}
            type="text"
            spellCheck={false}
            autoCapitalize="off"
            value={value}
            onChange={event => onChange(event.target.value)}
            className={cx(
              'block h-[1lh] w-full border-0 bg-transparent p-0 outline-none',
              value ? 'caret-text [caret-shape:block]' : 'caret-transparent',
            )}
          />
          {!value && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 truncate text-muted">
              {placeholder}
            </span>
          )}
        </div>
        {children}
      </div>
    </form>
  );
}
