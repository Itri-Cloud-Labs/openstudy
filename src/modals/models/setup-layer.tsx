import { TextAttributes } from '@opentui/core';
import { THEME } from '../../shared/theme.js';
import type { ModalRenderProps } from '../types.js';
import { getProviderLabel, type ModelsSetupState } from './state.js';

export function SetupLayer({ modal, context }: ModalRenderProps<ModelsSetupState>) {
  return (
    <>
      <box style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          {`Set Up ${getProviderLabel(modal.provider)}`}
        </text>
        <text fg={THEME.textMuted}>esc</text>
      </box>
      <box style={{ marginBottom: 1 }}>
        <text fg={THEME.textMuted}>Enter API key to unlock this provider.</text>
      </box>
      <box style={{ backgroundColor: THEME.backgroundRaised, paddingLeft: 1, paddingRight: 1, marginBottom: 1 }}>
        <text>
          <span fg={modal.apiKey ? THEME.text : THEME.textMuted}>
            {modal.apiKey ? '*'.repeat(modal.apiKey.length) : 'API key'}
          </span>
          <span fg={context.selectedSubject?.color ?? '#3b82f6'}>█</span>
        </text>
      </box>
      <box style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <text fg={modal.error ? THEME.danger : THEME.textMuted}>{modal.error ?? '← providers'}</text>
        <text fg={THEME.textMuted}>enter save</text>
      </box>
    </>
  );
}
