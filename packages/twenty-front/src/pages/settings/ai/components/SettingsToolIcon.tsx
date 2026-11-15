import { type ReactNode } from 'react';

import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getObjectColorWithFallback } from '@/object-metadata/utils/getObjectColorWithFallback';
import { isDefined } from 'twenty-shared/utils';
import { getIconTileColorShades } from 'twenty-ui/components/data-display';
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconTool,
  IconTrash,
  useIcons,
  type IconComponent,
} from 'twenty-ui/icon';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';
import { type SettingsAgentToolApplication } from '~/pages/settings/ai/types/SettingsAgentToolApplication';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, grayScale } from 'twenty-ui/theme/tokens.stylex';

type SettingsToolIconProps = {
  icon?: string | null;
  toolName?: string;
  objectName?: string;
  application?: ApplicationInfo;
};

type ApplicationInfo = Pick<SettingsAgentToolApplication, 'name'>;

const getOperationIcon = (toolName: string): IconComponent | null => {
  if (toolName.startsWith('create_')) return IconPlus;
  if (toolName.startsWith('update_')) return IconEdit;
  if (toolName.startsWith('delete_')) return IconTrash;
  if (toolName.startsWith('find_') || toolName.startsWith('get_'))
    return IconSearch;

  return null;
};

const styles = stylex.create({
  compositeContainer: {
    alignItems: 'center',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    height: '16px',
    justifyContent: 'center',
    position: 'relative',
    width: '16px',
  },
  mainIconWrapper: {
    alignItems: 'center',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    inset: 0,
    justifyContent: 'center',
    position: 'absolute',
  },
  mainIconBackground: (backgroundColor: string) => ({
    backgroundColor,
  }),
  mainIconBorder: (borderColor: string) => ({
    borderColor,
    borderStyle: 'solid',
    borderWidth: '1px',
  }),
  operationOverlay: {
    alignItems: 'center',
    backgroundColor: grayScale['--t-gray-scale-gray4'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    bottom: '-5px',
    display: 'flex',
    height: '14px',
    justifyContent: 'center',
    position: 'absolute',
    right: '-6px',
    width: '12px',
  },
});

type MainIconWrapperProps = {
  backgroundColor: string;
  borderColor?: string;
  children: ReactNode;
};

const MainIconWrapper = ({
  backgroundColor,
  borderColor,
  children,
}: MainIconWrapperProps) => (
  <div
    {...stylex.props(
      styles.mainIconWrapper,
      styles.mainIconBackground(backgroundColor),
      isDefined(borderColor) && styles.mainIconBorder(borderColor),
    )}
  >
    {children}
  </div>
);

export const SettingsToolIcon = ({
  icon,
  toolName,
  objectName,
  application,
}: SettingsToolIconProps) => {
  const { getIcon } = useIcons();
  const theme = useTheme();
  const { objectMetadataItems } = useObjectMetadataItems();

  if (isDefined(application)) {
    return (
      <Avatar
        name={application.name}
        colorSeed={application.name}
        shape="square"
        size="xs"
      />
    );
  }

  const MainIcon = isDefined(icon) ? getIcon(icon) : IconTool;
  const OperationIcon = isDefined(toolName) ? getOperationIcon(toolName) : null;

  const objectMetadata = isDefined(objectName)
    ? objectMetadataItems.find((item) => item.nameSingular === objectName)
    : undefined;

  const objectStyle = isDefined(objectMetadata)
    ? getIconTileColorShades(getObjectColorWithFallback(objectMetadata))
    : null;

  if (isDefined(OperationIcon)) {
    return (
      <div {...stylex.props(styles.compositeContainer)}>
        <MainIconWrapper
          backgroundColor={objectStyle?.backgroundColor ?? 'transparent'}
          borderColor={objectStyle?.borderColor}
        >
          <MainIcon
            size="14px"
            stroke={theme.icon.stroke.md}
            color={objectStyle?.iconColor ?? theme.font.color.secondary}
          />
        </MainIconWrapper>
        <div {...stylex.props(styles.operationOverlay)}>
          <OperationIcon
            size="12px"
            stroke={theme.icon.stroke.md}
            color={theme.font.color.tertiary}
          />
        </div>
      </div>
    );
  }

  if (isDefined(objectStyle)) {
    return (
      <div {...stylex.props(styles.compositeContainer)}>
        <MainIconWrapper
          backgroundColor={objectStyle.backgroundColor}
          borderColor={objectStyle.borderColor}
        >
          <MainIcon
            size="14px"
            stroke={theme.icon.stroke.md}
            color={objectStyle.iconColor}
          />
        </MainIconWrapper>
      </div>
    );
  }

  return (
    <MainIcon
      size={16}
      stroke={theme.icon.stroke.md}
      color={theme.font.color.tertiary}
    />
  );
};
