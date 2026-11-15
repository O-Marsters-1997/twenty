import { useAiChatFileUpload } from '@/ai/hooks/useAiChatFileUpload';
import { type ChangeEvent, type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  fileInput: {
    display: 'none',
  },
});

type AgentChatFileInputProps = {
  ref: Ref<HTMLInputElement>;
};

export const AgentChatFileInput = ({ ref }: AgentChatFileInputProps) => {
  const { uploadFiles } = useAiChatFileUpload();

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }

    const files = Array.from(event.target.files);

    uploadFiles(files);
    event.target.value = '';
  };

  return (
    <input
      ref={ref}
      type="file"
      multiple
      accept="*/*"
      onChange={handleFileInputChange} {...stylex.props(styles.fileInput)}
    />
  );
};
