import { ActivityRow } from '@/activities/components/ActivityRow';
import { AttachmentDropdown } from '@/activities/files/components/AttachmentDropdown';
import { downloadFile } from '@/activities/files/utils/downloadFile';
import { useDestroyOneRecord } from '@/object-record/hooks/useDestroyOneRecord';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import {
  FieldContext,
  type GenericFieldContextType,
} from '@/object-record/record-field/ui/contexts/FieldContext';
import { getFileCategoryFromExtension } from '@/object-record/record-field/ui/utils/getFileCategoryFromExtension';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useState } from 'react';
import { getSafeUrl, isDefined } from 'twenty-shared/utils';

import { type AttachmentWithFile } from '@/activities/files/utils/filterAttachmentsWithFile';
import { FileIcon } from '@/file/components/FileIcon';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { isNavigationModifierPressed } from '@/ui/navigation/utils/isNavigationModifierPressed';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconCalendar } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import { formatToHumanReadableDate } from '~/utils/date-utils';
import { getFileNameAndExtension } from '~/utils/file/getFileNameAndExtension';
import { openUrlInNewTab } from '~/utils/openUrlInNewTab';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  link: {
    alignItems: 'center',
    appearance: 'none',
    background: 'none',
    borderStyle: 'none',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':hover': fontColor['--t-font-color-secondary'],
    },
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    padding: 0,
    position: 'relative',
    textAlign: 'left',
    textDecoration: 'none',
    width: '100%',
    zIndex: 1,
  },
  leftContent: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-3'],
    overflow: 'auto',
    width: '100%',
  },
  rightContent: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-0_5'],
    position: 'relative',
    zIndex: '1',
  },
  calendarIconContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
  },
  linkContainer: {
    overflow: 'auto',
    width: '100%',
  },
  textInputContainer: {
    position: 'relative',
    width: '100%',
    zIndex: '1',
  },
});

type AttachmentRowProps = {
  attachment: AttachmentWithFile;
  onPreview?: (attachment: AttachmentWithFile) => void;
};

export const AttachmentRow = ({
  attachment,
  onPreview,
}: AttachmentRowProps) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);

  const hasDownloadPermission = useHasPermissionFlag(
    PermissionFlagType.DOWNLOAD_FILE,
  );

  const { name: originalFileName, extension: attachmentFileExtension } =
    getFileNameAndExtension(attachment.file.label);

  const [attachmentFileName, setAttachmentFileName] =
    useState(originalFileName);

  const fileCategory = getFileCategoryFromExtension(attachment.file.extension);

  const fileUrl = attachment.file.url;
  const safeFileUrl = getSafeUrl(fileUrl);

  const { destroyOneRecord: destroyOneAttachment } = useDestroyOneRecord({
    objectNameSingular: CoreObjectNameSingular.Attachment,
  });

  const handleDelete = () => {
    destroyOneAttachment(attachment.id);
  };

  const { updateOneRecord } = useUpdateOneRecord();

  const handleRename = () => {
    setIsEditing(true);
  };

  const saveAttachmentName = () => {
    setIsEditing(false);

    const newFileName = `${attachmentFileName}${attachmentFileExtension}`;

    updateOneRecord({
      objectNameSingular: CoreObjectNameSingular.Attachment,
      idToUpdate: attachment.id,
      updateOneRecordInput: {
        name: newFileName,
        file: [
          {
            fileId: attachment.file.fileId,
            label: newFileName,
          },
        ],
      },
    });
  };

  const handleOnBlur = () => {
    saveAttachmentName();
  };

  const handleOnChange = (newFileName: string) => {
    setAttachmentFileName(newFileName);
  };

  const handleOnKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }
    if (e.key === 'Enter') {
      saveAttachmentName();
    }
  };

  const handleDownload = () => {
    downloadFile(fileUrl, `${attachmentFileName}${attachmentFileExtension}`);
  };

  const handleRowClick = () => {
    if (isDefined(onPreview)) {
      onPreview(attachment);
      return;
    }

    if (!isDefined(safeFileUrl)) {
      return;
    }

    openUrlInNewTab(safeFileUrl);
  };

  const handleFileLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();

    // Cmd/Ctrl+click opens new tab, right click opens context menu
    if (isNavigationModifierPressed(event) === true) {
      return;
    }

    if (isDefined(onPreview)) {
      event.preventDefault();
      onPreview(attachment);
    }
  };

  return (
    <FieldContext.Provider
      value={
        {
          recordId: attachment.id,
        } as GenericFieldContextType
      }
    >
      <ActivityRow
        onClick={handleRowClick}
        disabled={isEditing}
        label={`${attachmentFileName}${attachmentFileExtension}`}
      >
        <div {...stylex.props(styles.leftContent)}>
          <FileIcon fileCategory={fileCategory} thumbnailUrl={fileUrl} />
          {isEditing ? (
            <div
              onClick={(event) => event.stopPropagation()} {...stylex.props(styles.textInputContainer)}
            >
              <SettingsTextInput
                instanceId={`attachment-${attachment.id}-name`}
                value={attachmentFileName}
                onChange={handleOnChange}
                onBlur={handleOnBlur}
                autoFocus
                onKeyDown={handleOnKeyDown}
              />
            </div>
          ) : (
            <div {...stylex.props(styles.linkContainer)}>
              <a
                {...stylex.props(styles.link)}
                onClick={handleFileLinkClick}
                href={safeFileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <OverflowingTextWithTooltip
                  text={`${attachmentFileName}${attachmentFileExtension}`}
                />
              </a>
            </div>
          )}
        </div>
        <div {...stylex.props(styles.rightContent)}>
          <div {...stylex.props(styles.calendarIconContainer)}>
            <IconCalendar size={theme.icon.size.md} />
          </div>
          {formatToHumanReadableDate(attachment.createdAt)}
          <AttachmentDropdown
            attachmentId={attachment.id}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onRename={handleRename}
            hasDownloadPermission={hasDownloadPermission}
          />
        </div>
      </ActivityRow>
    </FieldContext.Provider>
  );
};
