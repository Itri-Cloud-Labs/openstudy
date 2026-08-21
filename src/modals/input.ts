import type { ModalInputProps, ModalState } from './types.js';

interface ModalInputBinding<S extends ModalState> {
  when: (props: ModalInputProps<S>) => boolean;
  run: (props: ModalInputProps<S>) => void;
}

export function createHandleInput<S extends ModalState = ModalState>(
  bindings: Array<ModalInputBinding<S>>,
): (props: ModalInputProps<S>) => boolean {
  return props => {
    const binding = bindings.find(item => item.when(props));
    if (!binding) return false;

    binding.run(props);
    return true;
  };
}

export function isPlainTextInput({ input, key }: ModalInputProps): boolean {
  return !key.ctrl && !key.meta && !key.tab && input.length > 0;
}

export function isBackspace({ key }: ModalInputProps): boolean {
  return key.backspace || key.delete;
}

export function isCancel({ key }: ModalInputProps): boolean {
  return key.escape;
}

export function isSubmit({ key }: ModalInputProps): boolean {
  return key.return;
}
