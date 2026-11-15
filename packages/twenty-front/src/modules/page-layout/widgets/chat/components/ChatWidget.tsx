import { useState } from 'react';

import { AiChatTab } from '@/ai/components/AiChatTab';
import { AI_CHAT_SURFACE } from '@/ai/constants/AiChatSurface';
import { AiChatSurfaceContext } from '@/ai/contexts/AiChatSurfaceContext';
import { ChatWidgetOpenInChatPageEffect } from '@/page-layout/widgets/chat/components/ChatWidgetOpenInChatPageEffect';
import { ChatWidgetThreadSyncEffect } from '@/page-layout/widgets/chat/components/ChatWidgetThreadSyncEffect';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { isCurrentPathAiChatPage } from '~/utils/isCurrentPathAiChatPage';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  chatContainer: {
    '--ai-chat-content-max-width': '768px',
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    height: '100%',
    minHeight: '0',
    width: '100%',
  },
});

export const ChatWidget = () => {
  const targetRecord = useTargetRecord();
  const isInSidePanel = useWorkspaceSurface().type === 'side-panel';
  // Checked once so leaving for the chat page later does not pull this chat into it
  const [isOpenedBesideChatPage] = useState(
    () => isInSidePanel && isCurrentPathAiChatPage(),
  );

  if (isOpenedBesideChatPage) {
    return <ChatWidgetOpenInChatPageEffect threadId={targetRecord.id} />;
  }

  return (
    <div {...stylex.props(styles.chatContainer)}>
      <ChatWidgetThreadSyncEffect threadId={targetRecord.id} />
      <AiChatSurfaceContext.Provider
        value={
          isInSidePanel ? AI_CHAT_SURFACE.SIDE_PANEL : AI_CHAT_SURFACE.PAGE
        }
      >
        <AiChatTab />
      </AiChatSurfaceContext.Provider>
    </div>
  );
};
