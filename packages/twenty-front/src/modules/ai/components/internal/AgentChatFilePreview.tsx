import { getChipLabel } from '@/ui/field/display/utils/getChipLabel';
import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';
import { getFileType } from '@/activities/files/utils/getFileType';
import { useFileCategoryColors } from '@/file/hooks/useFileCategoryColors';
import { IconMapping } from '@/file/utils/fileIconMappings';
import { getFileCategoryFromExtension } from '@/object-record/record-field/ui/utils/getFileCategoryFromExtension';
import { AvatarOrIcon } from '@/ui/field/display/components/internal/AvatarOrIcon/AvatarOrIcon';
import { filePreviewState } from '@/ui/field/display/states/filePreviewState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { t } from '@lingui/core/macro';
import { useCallback } from 'react';
import { type ExtendedFileUIPart } from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';
import { type IconComponent, IconX } from 'twenty-ui/icon';
import { Chip } from 'twenty-ui/primitives/data-display';
import { Loader } from 'twenty-ui/primitives/feedback';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, color, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  previewButton: {
    alignItems: 'center',
    background: 'transparent',
    borderWidth: '0',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: 'inherit',
    cursor: { default: 'pointer', ':disabled': 'inherit' },
    display: 'inline-flex',
    font: 'inherit',
    gap: spacing['--t-spacing-1'],
    maxWidth: '100%',
    minWidth: '0',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    verticalAlign: 'middle',
    outline: { default: null, ':focus-visible': `2px solid ${color['--t-color-blue']}` },
    outlineOffset: { default: null, ':focus-visible': '-1px' },
  },
});

export const AgentChatFilePreview = ({
  file,
  onRemove,
  isUploading,
}: {
  file: ExtendedFileUIPart | File;
  onRemove?: () => void;
  isUploading?: boolean;
}) => {
  const theme = useTheme();
  const iconColors: Record<AttachmentFileCategory, string> =
    useFileCategoryColors();
  const setFilePreview = useSetAtomState(filePreviewState);

  const fileName =
    file instanceof File ? file.name : (file.filename ?? t`Unknown file`);

  const { text: displayName, content } = getChipLabel(fileName);

  const fileUrl = file instanceof File ? undefined : file.url;
  const fileId = file instanceof File ? undefined : file.fileId;

  const fileCategory: AttachmentFileCategory = getFileType(fileName);
  const extension = fileName.split('.').pop() ?? '';

  const FileCategoryIcon: IconComponent = IconMapping[fileCategory];
  const iconBackgroundColor: string = iconColors[fileCategory];

  const handleClick = useCallback(() => {
    if (!isDefined(fileUrl) || !isDefined(fileId)) {
      return;
    }

    setFilePreview({
      fileId,
      label: fileName,
      extension,
      url: fileUrl,
      fileCategory: getFileCategoryFromExtension(extension),
    });
  }, [fileUrl, fileId, fileName, extension, setFilePreview]);

  const leftComponent = isUploading ? (
    <Loader color="yellow" />
  ) : (
    <AvatarOrIcon
      Icon={FileCategoryIcon}
      IconBackgroundColor={iconBackgroundColor}
    />
  );

  const rightComponent = onRemove ? (
    <div onClick={(event) => event.stopPropagation()}>
      <AvatarOrIcon
        Icon={IconX}
        name={t`Remove ${displayName}`}
        IconColor={theme.font.color.secondary}
        onClick={onRemove}
      />
    </div>
  ) : undefined;

  const hasRightDivider = isDefined(onRemove);
  const isClickable = isDefined(fileUrl) && isDefined(fileId);

  return (
    <Chip
      variant="soft"
      startElement={
        <button
          type="button"
          disabled={!isClickable}
          onClick={handleClick} {...stylex.props(styles.previewButton)}
        >
          {leftComponent}
          <OverflowingTextWithTooltip
            render={<span />}
            text={content}
            tooltipContent={displayName}
            style={{ minWidth: 0 }}
          />
        </button>
      }
      endElement={rightComponent}
      endElementDivider={hasRightDivider}
    />
  );
};
