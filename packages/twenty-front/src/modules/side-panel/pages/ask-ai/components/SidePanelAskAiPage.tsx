import { AiChatTab } from '@/ai/components/AiChatTab';
import { AI_CHAT_SURFACE } from '@/ai/constants/AiChatSurface';
import { AiChatSurfaceContext } from '@/ai/contexts/AiChatSurfaceContext';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    height: '100%',
    width: '100%',
  },
});

export const SidePanelAskAiPage = () => {
  return (
    <AiChatSurfaceContext.Provider value={AI_CHAT_SURFACE.SIDE_PANEL}>
      <div {...stylex.props(styles.container)}>
        <AiChatTab />
      </div>
    </AiChatSurfaceContext.Provider>
  );
};
