import { AgentChatFilePreview } from '@/ai/components/internal/AgentChatFilePreview';
import { agentChatSelectedFilesState } from '@/ai/states/agentChatSelectedFilesState';
import { agentChatUploadedFilesState } from '@/ai/states/agentChatUploadedFilesState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  previewsContainer: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexWrap: 'wrap',
    width: '100%',
  },
});

export const AgentChatContextPreview = () => {
  const [agentChatSelectedFiles, setAgentChatSelectedFiles] = useAtomState(
    agentChatSelectedFilesState,
  );
  const [agentChatUploadedFiles, setAgentChatUploadedFiles] = useAtomState(
    agentChatUploadedFilesState,
  );

  const handleRemoveUploadedFile = (fileIndex: number) => {
    setAgentChatUploadedFiles(
      agentChatUploadedFiles.filter((_, index) => fileIndex !== index),
    );
  };

  const hasFiles =
    agentChatSelectedFiles.length > 0 || agentChatUploadedFiles.length > 0;

  if (!hasFiles) {
    return null;
  }

  return (
    <div {...stylex.props(styles.previewsContainer)}>
      {agentChatSelectedFiles.map((file, index) => (
        <AgentChatFilePreview
          file={file}
          key={`${index}-${file.name}`}
          onRemove={() => {
            setAgentChatSelectedFiles(
              agentChatSelectedFiles.filter(
                (selectedFile) => selectedFile !== file,
              ),
            );
          }}
          isUploading
        />
      ))}
      {agentChatUploadedFiles.map((file, index) => (
        <AgentChatFilePreview
          file={file}
          key={index}
          onRemove={() => handleRemoveUploadedFile(index)}
          isUploading={false}
        />
      ))}
    </div>
  );
};
