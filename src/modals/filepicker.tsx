import { Box, Text } from 'ink';
import { materialService, type MaterialEntry } from '../infrastructure/materials/index.js';
import { truncateError } from '../shared/text.js';
import { focusTextColor } from '../utils/index.js';
import { createHandleInput, isBackspace, isCancel, isPlainTextInput, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps } from './types.js';
import { THEME } from '../shared/theme.js';

const FILE_PICKER_MAX_ROWS = 10;
const HOME_DIR = materialService.homeDirectory;
const SOURCE_OPTIONS = [
  { id: 'computer', label: 'Material from computer', description: 'Choose a local document' },
  { id: 'url', label: 'Material from URL', description: 'Download a document from the web' },
] as const;
type FilePickerEntry = MaterialEntry;

type FilePickerModalState =
  | { id: 'filepicker'; layer: 'source'; selected: number; error?: string }
  | { id: 'filepicker'; layer: 'browser'; cwd: string; entries: FilePickerEntry[]; selected: number; error?: string }
  | { id: 'filepicker'; layer: 'url'; url: string; downloading: boolean; error?: string };

export function open(_context: ModalContext): FilePickerModalState {
  return { id: 'filepicker', layer: 'source', selected: 0 };
}

export function getHeight(modal: FilePickerModalState) {
  const state = modal;
  if (state.layer === 'source') return SOURCE_OPTIONS.length + 7;
  if (state.layer === 'url') return 8;

  const rows = Math.max(1, Math.min(FILE_PICKER_MAX_ROWS, state.entries.length));
  return rows + 8;
}

export function render(props: ModalRenderProps<FilePickerModalState>) {
  const state = props.modal;

  if (state.layer === 'source') return <SourceLayer {...props} modal={state} />;
  if (state.layer === 'url') return <UrlLayer modal={state} />;
  return <BrowserLayer {...props} modal={state} />;
}

function SourceLayer({ modal, context }: ModalRenderProps<Extract<FilePickerModalState, { layer: 'source' }>>) {
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Add Material
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Choose where your document comes from.</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {SOURCE_OPTIONS.map((option, index) => {
          const isSelected = modal.selected === index;

          return (
            <Box key={option.id} backgroundColor={isSelected ? subjectColor : undefined} justifyContent="space-between">
              <Text color={isSelected ? THEME.onAccent : THEME.text} bold={isSelected}>
                {option.label}
              </Text>
              <Text color={isSelected ? THEME.onAccent : THEME.textMuted}>{option.description}</Text>
            </Box>
          );
        })}
      </Box>
      <Box justifyContent="space-between">
        <Text color={modal.error ? THEME.danger : THEME.textMuted}>{modal.error ?? '↑↓ move'}</Text>
        <Text color={THEME.textMuted}>enter continue</Text>
      </Box>
    </>
  );
}

function UrlLayer({ modal }: { modal: Extract<FilePickerModalState, { layer: 'url' }> }) {
  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Material URL
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Enter a direct document URL. Use ctrl+v to paste from clipboard.</Text>
      </Box>
      <Box backgroundColor={THEME.backgroundRaised} paddingX={1} marginBottom={1}>
        <Text color={modal.url ? THEME.text : THEME.textMuted}>{modal.url || 'https://example.com/document.pdf'}</Text>
        {!modal.downloading && <Text color={THEME.primary}>█</Text>}
      </Box>
      <Box justifyContent="space-between">
        <Text color={modal.error ? THEME.danger : THEME.textMuted}>
          {modal.error ? truncateError(modal.error) : '← sources'}
        </Text>
        <Text color={THEME.textMuted}>{modal.downloading ? 'downloading...' : 'enter download'}</Text>
      </Box>
    </>
  );
}

function BrowserLayer({ modal, context }: ModalRenderProps<Extract<FilePickerModalState, { layer: 'browser' }>>) {
  const state = modal;
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';
  const rows = Math.max(1, Math.min(FILE_PICKER_MAX_ROWS, state.entries.length));
  const windowStart = Math.min(Math.max(0, state.selected - rows + 1), Math.max(0, state.entries.length - rows));
  const visibleEntries = state.entries.slice(windowStart, windowStart + rows);

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Select Material
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>{materialService.shortenPath(state.cwd)}</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {visibleEntries.length === 0 ? (
          <Text color={THEME.textMuted}>No documents found</Text>
        ) : (
          visibleEntries.map((entry, index) => {
            const entryIndex = windowStart + index;
            const isSelected = state.selected === entryIndex;
            const iconColor = entry.type === 'directory' ? subjectColor : THEME.textMuted;

            return (
              <Box
                key={entry.path}
                backgroundColor={isSelected ? subjectColor : undefined}
                justifyContent="space-between"
              >
                <Text color={focusTextColor(iconColor, subjectColor, isSelected)} bold={isSelected}>
                  {entry.type === 'directory' ? '▸ ' : '  '}
                </Text>
                <Text color={isSelected ? THEME.onAccent : THEME.text} bold={isSelected}>
                  {entry.name}
                </Text>
                <Text color={isSelected ? THEME.onAccent : THEME.textMuted}>
                  {entry.type === 'directory' ? 'dir' : 'file'}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
      <Box justifyContent="space-between">
        <Text color={state.error ? THEME.danger : THEME.textMuted}>
          {state.error ? truncateError(state.error) : state.cwd === HOME_DIR ? '← sources' : '← parent'}
        </Text>
        <Text color={THEME.textMuted}>enter open/select</Text>
      </Box>
      <Box justifyContent="flex-end">
        <Text color={THEME.textMuted}>
          {windowStart + 1}-{windowStart + visibleEntries.length}/{state.entries.length}
        </Text>
      </Box>
    </>
  );
}

export const handleInput = createHandleInput<FilePickerModalState>([
  {
    when: isCancel,
    run: ({ context }) => context.closeModal(),
  },
  {
    when: props => isSourceLayer(props) && isSourceInput(props),
    run: props => {
      if (props.modal.layer !== 'source') return;
      handleSourceInput(props.key, props.modal, props.context);
    },
  },
  {
    when: props => isBrowserLayer(props) && isBrowserInput(props),
    run: props => {
      if (props.modal.layer !== 'browser') return;
      handleBrowserInput(props.key, props.modal, props.context);
    },
  },
  {
    when: props => isUrlLayer(props) && isUrlInput(props),
    run: props => {
      if (props.modal.layer !== 'url') return;
      handleUrlInput(props.input, props.key, props.modal, props.context);
    },
  },
]);

function isSourceLayer({ modal }: ModalInputProps<FilePickerModalState>) {
  return modal.layer === 'source';
}

function isBrowserLayer({ modal }: ModalInputProps<FilePickerModalState>) {
  return modal.layer === 'browser';
}

function isUrlLayer({ modal }: ModalInputProps<FilePickerModalState>) {
  return modal.layer === 'url';
}

function isSourceInput(props: ModalInputProps<FilePickerModalState>) {
  return isSubmit(props) || props.key.upArrow || props.key.downArrow;
}

function isBrowserInput(props: ModalInputProps<FilePickerModalState>) {
  return isSubmit(props) || props.key.leftArrow || isBackspace(props) || props.key.upArrow || props.key.downArrow;
}

function isUrlInput(props: ModalInputProps<FilePickerModalState>) {
  return (
    isSubmit(props) ||
    props.key.leftArrow ||
    isBackspace(props) ||
    isPlainTextInput(props) ||
    (props.key.ctrl && props.input === 'v')
  );
}

function handleSourceInput(
  key: ModalInputProps['key'],
  state: Extract<FilePickerModalState, { layer: 'source' }>,
  context: ModalContext,
) {
  if (key.upArrow) {
    context.updateModal({
      ...state,
      selected: (state.selected - 1 + SOURCE_OPTIONS.length) % SOURCE_OPTIONS.length,
      error: undefined,
    });
    return;
  }

  if (key.downArrow) {
    context.updateModal({ ...state, selected: (state.selected + 1) % SOURCE_OPTIONS.length, error: undefined });
    return;
  }

  if (key.return) {
    const option = SOURCE_OPTIONS[state.selected];
    if (option?.id === 'computer') context.updateModal(readDirectory(HOME_DIR));
    if (option?.id === 'url') context.updateModal({ id: 'filepicker', layer: 'url', url: '', downloading: false });
  }
}

function handleBrowserInput(
  key: ModalInputProps['key'],
  state: Extract<FilePickerModalState, { layer: 'browser' }>,
  context: ModalContext,
) {
  if (key.return) {
    selectEntry(state, context);
    return;
  }

  if (key.leftArrow || key.backspace || key.delete) {
    goToParent(state, context);
    return;
  }

  if (key.upArrow) {
    moveSelection(state, context, -1);
    return;
  }

  if (key.downArrow) {
    moveSelection(state, context, 1);
  }
}

function handleUrlInput(
  input: string,
  key: ModalInputProps['key'],
  state: Extract<FilePickerModalState, { layer: 'url' }>,
  context: ModalContext,
) {
  if (state.downloading) return;

  if (key.leftArrow) {
    context.updateModal({ id: 'filepicker', layer: 'source', selected: 1 });
    return;
  }

  if (key.return) {
    void downloadUrlMaterial(state, context);
    return;
  }

  if (key.ctrl && input === 'v') {
    const pasted = materialService.readClipboard();
    if (!pasted) {
      context.updateModal({ ...state, error: 'Clipboard paste is unavailable in this terminal.' });
      return;
    }

    context.updateModal({ ...state, url: `${state.url}${pasted.trim()}`, error: undefined });
    return;
  }

  if (key.backspace || key.delete) {
    context.updateModal({ ...state, url: state.url.slice(0, -1), error: undefined });
    return;
  }

  if (!key.ctrl && !key.meta && !key.tab && input) {
    context.updateModal({ ...state, url: state.url + input, error: undefined });
  }
}

function selectEntry(state: Extract<FilePickerModalState, { layer: 'browser' }>, context: ModalContext) {
  const entry = state.entries[state.selected];
  if (!entry) return;

  if (entry.type === 'directory') {
    context.updateModal(readDirectory(entry.path));
    return;
  }

  try {
    materialService.assertReadable(entry.path);
  } catch {
    context.updateModal({ ...state, error: 'OpenStudy does not have permission to read this document.' });
    return;
  }

  context.updateSettings({ material: entry.path });
  context.closeModal();
}

function goToParent(state: Extract<FilePickerModalState, { layer: 'browser' }>, context: ModalContext) {
  if (state.cwd === HOME_DIR) {
    context.updateModal({ id: 'filepicker', layer: 'source', selected: 0 });
    return;
  }

  const parent = materialService.parentOf(state.cwd);
  if (!parent) return;

  context.updateModal(readDirectory(parent));
}

function moveSelection(
  state: Extract<FilePickerModalState, { layer: 'browser' }>,
  context: ModalContext,
  direction: -1 | 1,
) {
  if (state.entries.length === 0) return;

  context.updateModal({
    ...state,
    selected: (state.selected + direction + state.entries.length) % state.entries.length,
    error: undefined,
  });
}

async function downloadUrlMaterial(state: Extract<FilePickerModalState, { layer: 'url' }>, context: ModalContext) {
  context.updateModal({ ...state, downloading: true, error: undefined });

  try {
    const target = await materialService.importUrl(state.url);
    context.updateSettings({ material: target });
    context.closeModal();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.updateModal({ ...state, downloading: false, error: message });
  }
}

function readDirectory(directory: string): FilePickerModalState {
  const result = materialService.listDirectory(directory);
  return {
    id: 'filepicker',
    layer: 'browser',
    cwd: result.path,
    entries: result.entries,
    selected: 0,
    ...(result.error ? { error: result.error } : {}),
  };
}
