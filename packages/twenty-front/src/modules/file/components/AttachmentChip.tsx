import { AvatarOrIcon } from '@/ui/field/display/components/internal/AvatarOrIcon/AvatarOrIcon';
import { IconX } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { getFileType } from '@/activities/files/utils/getFileType';
import { useFileCategoryColors } from '@/file/hooks/useFileCategoryColors';
import { IconMapping } from '@/file/utils/fileIconMappings';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type AttachmentChipProps = {
  file: { id: string; name: string };
  onRemove: () => void;
  readonly?: boolean;
};

const styles = stylex.create({
  chip: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    cornerShape: 'round',
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    columnGap: spacing['--t-spacing-1'],
    display: 'inline-flex',
    flexDirection: 'row',
    flexShrink: '0',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm-round'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm-round'],
    maxWidth: '140px',
    paddingLeft: spacing['--t-spacing-1'],
  },
  label: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  delete: {
    background: 'none',
    borderStyle: 'none',
    cornerShape: 'round',
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-medium'],
    },
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
    display: 'flex',
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-sm'],
    justifyContent: 'center',
    userSelect: 'none',
    borderBottomRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm-round'],
    height: '20px',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
    width: '20px',
  },
});

export const AttachmentChip = ({
  file,
  onRemove,
  readonly = false,
}: AttachmentChipProps) => {
  const theme = useTheme();
  const iconColors = useFileCategoryColors();

  const handleChipClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleRemoveClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onRemove();
  };

  return (
    <div onClick={handleChipClick} {...stylex.props(styles.chip)}>
      <AvatarOrIcon
        Icon={IconMapping[getFileType(file.name)]}
        IconBackgroundColor={iconColors[getFileType(file.name)]}
      />
      <span title={file.name} {...stylex.props(styles.label)}>
        {file.name}
      </span>

      {!readonly && (
        <button onClick={handleRemoveClick} {...stylex.props(styles.delete)}>
          <IconX size={theme.icon.size.sm} stroke={theme.icon.stroke.sm} />
        </button>
      )}
    </div>
  );
};
