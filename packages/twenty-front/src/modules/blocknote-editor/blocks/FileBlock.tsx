import { createReactBlockSpec } from '@blocknote/react';
import { isNonEmptyString } from '@sniptt/guards';
import { type ChangeEvent, useRef } from 'react';

import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';
import { getFileType } from '@/activities/files/utils/getFileType';
import { FileIcon } from '@/file/components/FileIcon';
import { t } from '@lingui/core/macro';
import { getSafeUrl, isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  link: {
    alignItems: 'center',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':hover': fontColor['--t-font-color-secondary'],
    },
    display: 'flex',
    textDecoration: 'none',
  },
  fileInput: {
    display: 'none',
  },
  fileLine: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  uploadFileContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
});

export const FileBlock = createReactBlockSpec(
  {
    type: 'file',
    propSchema: {
      url: {
        default: '',
      },
      name: {
        default: '',
      },
      fileCategory: {
        default: 'OTHER' as AttachmentFileCategory,
      },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      // oxlint-disable-next-line react-hooks/rules-of-hooks
      const inputFileRef = useRef<HTMLInputElement>(null);

      const handleUploadAttachment = async (file: File) => {
        if (!isDefined(file)) {
          return '';
        }
        const fileUrl = await editor.uploadFile?.(file);

        if (!isNonEmptyString(fileUrl)) {
          return '';
        }

        editor.updateBlock(block.id, {
          props: {
            ...block.props,
            url: fileUrl,
            fileCategory: getFileType(file.name),
            name: file.name,
          },
        });
      };
      const handleUploadFileClick = () => {
        inputFileRef?.current?.click?.();
      };
      const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (isDefined(e.target.files))
          handleUploadAttachment?.(e.target.files[0]);
      };

      const safeUrl = getSafeUrl(block.props.url);

      if (safeUrl) {
        return (
          <div {...stylex.props(styles.fileLine)}>
            <FileIcon
              fileCategory={block.props.fileCategory as AttachmentFileCategory}
              thumbnailUrl={safeUrl}
            />
            <a
              {...stylex.props(styles.link)}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {block.props.name}
            </a>
          </div>
        );
      }

      return (
        <div {...stylex.props(styles.uploadFileContainer)}>
          <input
            ref={inputFileRef}
            onChange={handleFileChange}
            type="file" {...stylex.props(styles.fileInput)}
          />
          <Button onClick={handleUploadFileClick}>{t`Upload File`}</Button>
        </div>
      );
    },
  },
);
