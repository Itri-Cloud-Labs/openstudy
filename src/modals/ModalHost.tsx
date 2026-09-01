import type { ActiveModal, ModalRenderContext } from './types.js';
import { THEME } from '../shared/theme.js';

interface ModalHostProps {
  modal: ActiveModal;
  termWidth: number;
  termHeight: number;
  context: ModalRenderContext;
}

export const ModalHost = ({ modal, termWidth, termHeight, context }: ModalHostProps) => {
  const width = Math.min(60, Math.max(1, termWidth - 4));
  const height = modal.module.getHeight(modal.state);
  const top = Math.max(0, Math.floor((termHeight - height) / 2));
  const left = Math.max(0, Math.floor((termWidth - width) / 2));

  return (
    <box
      style={{
        position: 'absolute',
        top,
        left,
        width,
        flexDirection: 'column',
        borderStyle: 'single',
        borderColor: THEME.rule,
        backgroundColor: THEME.backgroundPanel,
        paddingLeft: 2,
        paddingRight: 2,
        paddingTop: 1,
        paddingBottom: 1,
        zIndex: 20,
      }}
    >
      {modal.module.render({ modal: modal.state, context })}
    </box>
  );
};
