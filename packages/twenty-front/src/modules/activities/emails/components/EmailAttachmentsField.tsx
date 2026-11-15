import { type EmailAttachment } from 'twenty-shared/types';

import { AttachmentChip } from '@/file/components/AttachmentChip';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type EmailAttachmentsFieldProps = {
  files: EmailAttachment[];
  onChange: (files: EmailAttachment[]) => void;
};

const styles = stylex.create({
  chipsContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-1'],
  },
});

export const EmailAttachmentsField = ({
  files,
  onChange,
}: EmailAttachmentsFieldProps) => {
  const handleRemoveFile = (fileId: string) => {
    onChange(files.filter((file) => file.id !== fileId));
  };

  return (
    <div {...stylex.props(styles.chipsContainer)}>
      {files.map((file) => (
        <AttachmentChip
          key={file.id}
          file={file}
          onRemove={() => handleRemoveFile(file.id)}
        />
      ))}
    </div>
  );
};
