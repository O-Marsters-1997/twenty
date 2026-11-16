import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

import { MenuItemIconBoxContainer } from '@ui/components/navigation/MenuItem/parts/MenuItemIconBoxContainer';
import { IconGripVertical } from '@ui/icon';
import { useTheme } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { animationDuration } from '../../../../theme/tokens.stylex';
import { menuItemMarker } from './StyledMenuItemBase.stylex';

export type MenuItemIconWithGripSwapProps = {
  leadingContent?: ReactNode;
  withIconContainer?: boolean;
  withIconContainerBackground?: boolean;
  gripIconColor: string;
};

export const MenuItemIconWithGripSwap = ({
  leadingContent,
  withIconContainer = false,
  withIconContainerBackground = true,
  gripIconColor,
}: MenuItemIconWithGripSwapProps) => {
  const theme = useTheme();

  if (!isDefined(leadingContent)) {
    return null;
  }

  const iconContent = (
    <div {...stylex.props(styles.iconSwapContainer)}>
      <div
        {...mergeStylexProps(
          stylex.props(styles.defaultIcon),
          'grip-swap-default-icon',
        )}
      >
        {leadingContent}
      </div>
      <div
        {...mergeStylexProps(
          stylex.props(styles.hoverIcon),
          'grip-swap-hover-icon',
        )}
      >
        <IconGripVertical
          size={theme.icon.size.md}
          stroke={theme.icon.stroke.sm}
          color={gripIconColor}
        />
      </div>
    </div>
  );

  if (withIconContainer) {
    return (
      <MenuItemIconBoxContainer hasBackground={withIconContainerBackground}>
        {iconContent}
      </MenuItemIconBoxContainer>
    );
  }

  return iconContent;
};

const opacityTransition = `opacity calc(${animationDuration['--t-animation-duration-instant']} * 1s) ease`;

const styles = stylex.create({
  iconSwapContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
  },
  defaultIcon: {
    display: 'flex',
    opacity: {
      default: null,
      [stylex.when.ancestor(':hover', menuItemMarker)]: 0,
    },
    transition: opacityTransition,
  },
  hoverIcon: {
    display: 'flex',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', menuItemMarker)]: 1,
    },
    position: 'absolute',
    transition: opacityTransition,
  },
});
