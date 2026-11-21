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
    padding: 0,
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  containerDragging: {
    padding: spacing['--t-spacing-3'],
    height: 'calc(100% - 24px)',
  },
});

export const AiChatTab = () => {
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
