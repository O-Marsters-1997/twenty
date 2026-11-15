import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';
import { useFileIconColors } from '@/file/hooks/useFileIconColors';
import { IconMapping } from '@/file/utils/fileIconMappings';
import { AvatarOrIcon } from '@/ui/field/display/components/internal/AvatarOrIcon/AvatarOrIcon';
import * as stylex from '@stylexjs/stylex';
import { isNonEmptyString } from '@sniptt/guards';
import { borderRadius, grayScale } from 'twenty-ui/theme/tokens.stylex';
import { useState } from 'react';
import { FILE_CATEGORIES, type FileCategory } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { useTheme } from 'twenty-ui/theme';

type FileIconSize = 'small' | 'medium';

const THUMBNAIL_SIZE_PX_BY_FILE_ICON_SIZE: Record<FileIconSize, number> = {
  small: 14,
  medium: 24,
};

const styles = stylex.create({
  iconContainer: (background: string) => ({
    alignItems: 'center',
    background,
    borderRadius: borderRadius['--t-border-radius-sm'],
    color: grayScale['--t-gray-scale-gray1'],
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    padding: '5px',
  }),
  thumbnail: (sizePx: number) => ({
    borderRadius: borderRadius['--t-border-radius-sm'],
    flexShrink: 0,
    height: sizePx,
    objectFit: 'cover',
    width: sizePx,
  }),
});

type FileIconProps = {
  fileCategory: AttachmentFileCategory | FileCategory;
  size?: FileIconSize;
  thumbnailUrl?: string;
};

export const FileIcon = ({
  fileCategory,
  size = 'medium',
  thumbnailUrl,
}: FileIconProps) => {
  const theme = useTheme();
  const iconColors = useFileIconColors();
  const Icon = IconMapping[fileCategory];
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState<string>();

  const shouldRenderThumbnail =
    fileCategory === FILE_CATEGORIES.IMAGE &&
    isNonEmptyString(thumbnailUrl) &&
    failedThumbnailUrl !== thumbnailUrl;

  if (shouldRenderThumbnail) {
    return (
      <img
        {...stylex.props(
          styles.thumbnail(THUMBNAIL_SIZE_PX_BY_FILE_ICON_SIZE[size]),
        )}
        alt=""
        aria-hidden
        src={thumbnailUrl}
        onError={() => setFailedThumbnailUrl(thumbnailUrl)}
      />
    );
  }

  if (size === 'small') {
    return (
      <AvatarOrIcon
        Icon={Icon}
        IconBackgroundColor={iconColors[fileCategory] ?? theme.color.gray}
      />
    );
  }

  return (
    <div
      {...stylex.props(
        styles.iconContainer(iconColors[fileCategory] ?? theme.color.gray),
      )}
    >
      {isDefined(Icon) && (
        <Icon size={theme.icon.size.sm} stroke={theme.icon.stroke.sm} />
      )}
    </div>
  );
};
