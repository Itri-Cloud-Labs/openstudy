import { Box, Text } from 'ink';
import { materialService, type MaterialEntry } from '../infrastructure/materials/index.js';
import { focusTextColor } from '../utils/index.js';
import { createHandleInput, isBackspace, isCancel, isPlainTextInput, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps, ModalState } from './types.js';

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

export function open(_context: ModalContext): ModalState {
  return { id: 'filepicker', layer: 'source', selected: 0 };
}

export function getHeight(modal: ModalState) {
  const state = modal as FilePickerModalState;
  if (state.layer === 'source') return SOURCE_OPTIONS.length + 7;
  if (state.layer === 'url') return 8;

  const rows = Math.max(1, Math.min(FILE_PICKER_MAX_ROWS, state.entries.length));
  return rows + 8;
}

export function render(props: ModalRenderProps) {
  const state = props.modal as FilePickerModalState;

  if (state.layer === 'source') return <SourceLayer {...props} modal={state} />;
  if (state.layer === 'url') return <UrlLayer modal={state} />;
  return <BrowserLayer {...props} modal={state} />;
}

function SourceLayer({
  modal,
  context,
}: ModalRenderProps & { modal: Extract<FilePickerModalState, { layer: 'source' }> }) {
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="#f0f0f0" bold>
          Add Material
        </Text>
        <Text color="#777777">esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="#777777">Choose where your document comes from.</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {SOURCE_OPTIONS.map((option, index) => {
          const isSelected = modal.selected === index;

          return (
            <Box key={option.id} backgroundColor={isSelected ? subjectColor : undefined} justifyContent="space-between">
              <Text color={isSelected ? '#000000' : '#f0f0f0'} bold={isSelected}>
                {option.label}
              </Text>
              <Text color={isSelected ? '#000000' : '#777777'}>{option.description}</Text>
            </Box>
          );
        })}
      </Box>
      <Box justifyContent="space-between">
        <Text color={modal.error ? '#ef4444' : '#777777'}>{modal.error ?? '↑↓ move'}</Text>
        <Text color="#777777">enter continue</Text>
      </Box>
    </>
  );
}

function UrlLayer({ modal }: { modal: Extract<FilePickerModalState, { layer: 'url' }> }) {
  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="#f0f0f0" bold>
          Material URL
        </Text>
        <Text color="#777777">esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="#777777">Enter a direct document URL. Use ctrl+v to paste from clipboard.</Text>
      </Box>
      <Box backgroundColor="#1f1f23" paddingX={1} marginBottom={1}>
        <Text color={modal.url ? '#f0f0f0' : '#777777'}>{modal.url || 'https://example.com/document.pdf'}</Text>
        {!modal.downloading && <Text color="#f0a500">█</Text>}
      </Box>
      <Box justifyContent="space-between">
        <Text color={modal.error ? '#ef4444' : '#777777'}>
          {modal.error ? truncateError(modal.error) : '← sources'}
        </Text>
        <Text color="#777777">{modal.downloading ? 'downloading...' : 'enter download'}</Text>
      </Box>
    </>
  );
}

function BrowserLayer({
  modal,
  context,
}: ModalRenderProps & { modal: Extract<FilePickerModalState, { layer: 'browser' }> }) {
  const state = modal;
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';
  const rows = Math.max(1, Math.min(FILE_PICKER_MAX_ROWS, state.entries.length));
  const windowStart = Math.min(Math.max(0, state.selected - rows + 1), Math.max(0, state.entries.length - rows));
  const visibleEntries = state.entries.slice(windowStart, windowStart + rows);

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="#f0f0f0" bold>
          Select Material
        </Text>
        <Text color="#777777">esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="#777777">{materialService.shortenPath(state.cwd)}</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {visibleEntries.length === 0 ? (
          <Text color="#777777">No documents found</Text>
        ) : (
          visibleEntries.map((entry, index) => {
            const entryIndex = windowStart + index;
            const isSelected = state.selected === entryIndex;
            const iconColor = entry.type === 'directory' ? subjectColor : '#888888';

            return (
              <Box
                key={entry.path}
                backgroundColor={isSelected ? subjectColor : undefined}
                justifyContent="space-between"
              >
                <Text color={focusTextColor(iconColor, subjectColor, isSelected)} bold={isSelected}>
                  {entry.type === 'directory' ? '▸ ' : '  '}
                </Text>
                <Text color={isSelected ? '#000000' : '#f0f0f0'} bold={isSelected}>
                  {entry.name}
                </Text>
                <Text color={isSelected ? '#000000' : '#777777'}>{entry.type === 'directory' ? 'dir' : 'file'}</Text>
              </Box>
            );
          })
        )}
      </Box>
      <Box justifyContent="space-between">
        <Text color={state.error ? '#ef4444' : '#777777'}>
          {state.error ? truncateError(state.error) : state.cwd === HOME_DIR ? '← sources' : '← parent'}
        </Text>
        <Text color="#777777">enter open/select</Text>
      </Box>
      <Box justifyContent="flex-end">
        <Text color="#777777">
          {windowStart + 1}-{windowStart + visibleEntries.length}/{state.entries.length}
        </Text>
      </Box>
    </>
  );
}

export const handleInput = createHandleInput([
  {
    when: isCancel,
    run: ({ context }) => context.closeModal(),
  },
  {
    when: props => isSourceLayer(props) && isSourceInput(props),
    run: props =>
      handleSourceInput(props.key, props.modal as Extract<FilePickerModalState, { layer: 'source' }>, props.context),
  },
  {
    when: props => isBrowserLayer(props) && isBrowserInput(props),
    run: props =>
      handleBrowserInput(props.key, props.modal as Extract<FilePickerModalState, { layer: 'browser' }>, props.context),
  },
  {
    when: props => isUrlLayer(props) && isUrlInput(props),
    run: props =>
      handleUrlInput(
        props.input,
        props.key,
        props.modal as Extract<FilePickerModalState, { layer: 'url' }>,
        props.context,
      ),
  },
]);

function isSourceLayer({ modal }: ModalInputProps) {
  return (modal as FilePickerModalState).layer === 'source';
}

function isBrowserLayer({ modal }: ModalInputProps) {
  return (modal as FilePickerModalState).layer === 'browser';
}

function isUrlLayer({ modal }: ModalInputProps) {
  return (modal as FilePickerModalState).layer === 'url';
}

function isSourceInput(props: ModalInputProps) {
  return isSubmit(props) || props.key.upArrow || props.key.downArrow;
}

function isBrowserInput(props: ModalInputProps) {
  return isSubmit(props) || props.key.leftArrow || isBackspace(props) || props.key.upArrow || props.key.downArrow;
}

function isUrlInput(props: ModalInputProps) {
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

function truncateError(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim();
  return normalized.length > 54 ? `${normalized.slice(0, 53)}…` : normalized;
}
