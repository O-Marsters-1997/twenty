import { useIsWorkspaceSetupChat } from '@/ai/hooks/useIsWorkspaceSetupChat';
import { WorkspaceSetupChatKickoffEffect } from '@/onboarding/effect-components/WorkspaceSetupChatKickoffEffect';
import { type DragEvent, useState } from 'react';

import { DropZone } from '@/activities/files/components/DropZone';
import { AgentChatHasBeenOpenedEffect } from '@/ai/components/AgentChatHasBeenOpenedEffect';
import { AgentChatThreadMarkAsReadEffect } from '@/ai/components/AgentChatThreadMarkAsReadEffect';
import { AgentChatStreamingPartsDiffSyncEffect } from '@/ai/components/AgentChatStreamingPartsDiffSyncEffect';
import { AiChatEditorSection } from '@/ai/components/AiChatEditorSection';
import { useAiChatFileUpload } from '@/ai/hooks/useAiChatFileUpload';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

import { AiChatQueuedMessages } from '@/ai/components/AiChatQueuedMessages';
import { AiChatTabMessageList } from '@/ai/components/AiChatTabMessageList';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: 0,
  },
  containerDragging: {
    height: 'calc(100% - 24px)',
    padding: spacing['--t-spacing-3'],
  },
});

export const AiChatTab = () => {
  const isWorkspaceSetupChat = useIsWorkspaceSetupChat();
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);

  const { uploadFiles } = useAiChatFileUpload();

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setIsDraggingFile(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
  };

  return (
    <div
      {...stylex.props(
        styles.container,
        isDraggingFile && styles.containerDragging,
      )}
      onDragEnter={() => setIsDraggingFile(true)}
      onDragLeave={handleDragLeave}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      {isWorkspaceSetupChat && <WorkspaceSetupChatKickoffEffect />}
      <AgentChatHasBeenOpenedEffect />
      <AgentChatThreadMarkAsReadEffect />
      <AgentChatStreamingPartsDiffSyncEffect />
      {isDraggingFile && (
        <DropZone
          setIsDraggingFile={setIsDraggingFile}
          onUploadFiles={uploadFiles}
        />
      )}
      {!isDraggingFile && (
        <>
          <AiChatTabMessageList />
          <AiChatQueuedMessages />
          <AiChatEditorSection key={currentAiChatThread} />
        </>
      )}
    </div>
  );
};
