import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { cx } from './ui';

export interface ModalItem {
  label: string;
  value?: string;
  color?: string;
  hint?: string;
  current?: boolean;
}

interface MessageSpec {
  title: string;
  message: string;
}

interface ListSpec {
  title: string;
  sub?: string;
  search?: boolean;
  selected?: number;
  maxRows?: number;
  empty?: string;
  footRight?: string;
  items: ModalItem[];
  onSelect: (item: ModalItem) => void;
}

export type ModalSpec = MessageSpec | ListSpec;
export type ShowModal = (spec: ModalSpec, returnFocus: HTMLElement | null) => void;

interface OpenModal {
  id: number;
  spec: ModalSpec;
  returnFocus: HTMLElement | null;
}

const MAX_ROWS = 6;

// One modal per terminal, like ModalHost.tsx. Render the returned layer inside the terminal screen.
export function useModal(): [ReactNode, ShowModal] {
  const [open, setOpen] = useState<OpenModal | null>(null);
  const nextId = useRef(0);

  const show = useCallback<ShowModal>((spec, returnFocus) => {
    nextId.current += 1;
    setOpen({ id: nextId.current, spec, returnFocus });
  }, []);

  if (!open) return [null, show];

  const close = (restoreFocus = true) => {
    setOpen(current => (current?.id === open.id ? null : current));
    if (restoreFocus) open.returnFocus?.focus({ preventScroll: true });
  };

  const layer = (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking the backdrop dismisses; escape is the keyboard path.
    // biome-ignore lint/a11y/useKeyWithClickEvents: the dialog handles escape itself.
    <div
      key={open.id}
      className="absolute inset-0 z-20 grid place-items-center px-[2ch] py-[1lh]"
      onClick={event => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {'message' in open.spec ? (
        <MessageModal spec={open.spec} onClose={close} />
      ) : (
        <ListModal spec={open.spec} onClose={close} />
      )}
    </div>
  );

  return [layer, show];
}

type Close = (restoreFocus?: boolean) => void;

function Dialog({
  title,
  onClose,
  onKeyDown,
  children,
}: {
  title: string;
  onClose: Close;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className="w-[min(60ch,100%)] space-y-[1lh] border border-rule bg-panel px-[2ch] py-[1lh] motion-safe:animate-modal-in"
      onKeyDown={onKeyDown}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) onClose(false);
      }}
    >
      <div className="flex justify-between gap-[2ch] text-muted">
        <strong className="text-text">{title}</strong>
        <button type="button" aria-label="Close" className="hover:text-text" onClick={() => onClose()}>
          esc
        </button>
      </div>
      {children}
    </div>
  );
}

function MessageModal({ spec, onClose }: { spec: MessageSpec; onClose: Close }) {
  const ok = useRef<HTMLButtonElement>(null);

  useEffect(() => ok.current?.focus({ preventScroll: true }), []);

  return (
    <Dialog
      title={spec.title}
      onClose={onClose}
      onKeyDown={event => {
        if (event.key !== 'Escape' && event.key !== 'Enter') return;
        event.preventDefault();
        onClose();
      }}
    >
      <p className="text-muted">{spec.message}</p>
      <div className="flex justify-end">
        <button
          ref={ok}
          type="button"
          className="inline-block bg-subject px-[1ch] text-on-subject"
          onClick={() => onClose()}
        >
          enter close
        </button>
      </div>
    </Dialog>
  );
}

function ListModal({ spec, onClose }: { spec: ListSpec; onClose: Close }) {
  const [selected, setSelected] = useState(Math.max(0, spec.selected ?? 0));
  const [filter, setFilter] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const optionId = useId();

  useEffect(() => list.current?.focus({ preventScroll: true }), []);

  const items = spec.items.filter(item => item.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const rows = Math.max(1, Math.min(spec.maxRows ?? MAX_ROWS, items.length));
  const start = Math.min(Math.max(0, selected - rows + 1), Math.max(0, items.length - rows));
  const visible = items.slice(start, start + rows);

  const choose = (item: ModalItem | undefined) => {
    onClose();
    if (item) spec.onSelect(item);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = Math.max(1, items.length);
    const onButton = event.target instanceof Element && event.target.closest('button');

    if (event.key === 'Escape') onClose();
    else if (event.key === 'Enter' && !onButton) choose(items[selected]);
    else if (event.key === 'ArrowDown') setSelected((selected + 1) % count);
    else if (event.key === 'ArrowUp') setSelected((selected - 1 + count) % count);
    else if (spec.search && event.key === 'Backspace') {
      setFilter(filter.slice(0, -1));
      setSelected(0);
    } else if (spec.search && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setFilter(filter + event.key);
      setSelected(0);
    } else return;
    event.preventDefault();
  };

  return (
    <Dialog title={spec.title} onClose={onClose} onKeyDown={onKeyDown}>
      {spec.sub && <p className="text-muted">{spec.sub}</p>}
      {spec.search && (
        <p aria-hidden="true" className="text-muted">
          Search <span className="text-text">{filter}</span>
          <i className="inline-block h-[1lh] w-[1ch] bg-subject align-bottom" />
        </p>
      )}
      <div
        ref={list}
        role="listbox"
        tabIndex={0}
        aria-label={spec.title}
        aria-activedescendant={items.length > 0 ? `${optionId}-${selected}` : undefined}
        className="outline-none"
      >
        {visible.map((item, offset) => {
          const index = start + offset;
          const active = index === selected;
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox handles arrows and enter through aria-activedescendant.
            // biome-ignore lint/a11y/useFocusableInteractive: focus stays on the listbox.
            <div
              key={item.label}
              id={`${optionId}-${index}`}
              role="option"
              aria-selected={active}
              className={cx(
                'flex cursor-pointer justify-between gap-[2ch]',
                active ? 'bg-subject font-bold text-on-subject' : 'hover:bg-raised',
              )}
              onClick={() => choose(item)}
            >
              <span>
                {item.color && (
                  <span
                    className={cx('mr-[1ch] inline-block size-[0.62em] rounded-full', active && 'bg-on-subject')}
                    style={active ? undefined : { background: item.color }}
                  />
                )}
                {item.label}
              </span>
              {(item.hint || item.current) && (
                <small className={cx('text-[1em]', !active && (item.current ? 'text-success' : 'text-muted'))}>
                  {item.current ? 'current' : item.hint}
                </small>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          // biome-ignore lint/a11y/useFocusableInteractive: focus stays on the listbox.
          <div role="option" aria-selected="false" aria-disabled="true" className="text-muted">
            {spec.empty ?? 'No results found'}
          </div>
        )}
      </div>
      <div className="flex justify-between gap-[2ch] text-muted">
        <span>{`↑↓ move ${items.length ? start + 1 : 0}-${start + visible.length}/${items.length}`}</span>
        <span>{spec.footRight ?? 'enter select'}</span>
      </div>
    </Dialog>
  );
}
