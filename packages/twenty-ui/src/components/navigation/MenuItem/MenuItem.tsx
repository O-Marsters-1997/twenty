import { isDefined } from '@ui/utilities/utils/isDefined';
import { IconChevronRight } from '@ui/icon';
import { type MouseEvent } from 'react';
import { type MenuItemProps } from './types/MenuItemProps';

import { MenuItemLeftContent } from '@ui/components/navigation/MenuItem/parts/MenuItemLeftContent';
import {
  StyledHoverableMenuItemBase,
  StyledMenuItemHoverableButtons,
  StyledMenuItemRightContent,
} from '@ui/components/navigation/MenuItem/parts/StyledMenuItemBase';
import { Shortcut } from '@ui/primitives/typography/Shortcut/Shortcut';
import { useTheme } from '@ui/theme';
import * as stylex from '@stylexjs/stylex';

import { animationDuration } from '../../../theme/tokens.stylex';

export const MenuItem = ({
  accent = 'default',
  className,
  withIconContainer = false,
  withIconContainerBackground = true,
  iconButtons,
  isIconDisplayedOnHoverOnly = true,
  LeftIcon,
  iconThemeColor,
  LeftComponent,
  RightIcon,
  RightComponent,
  onClick,
  onMouseEnter,
  onMouseLeave,
  testId,
  text,
  contextualTextPosition = 'left',
  contextualText,
  hasSubMenu = false,
  disabled = false,
  focused = false,
  selected = false,
  shortcut,
  shortcutJoinLabel,
  isSubMenuOpened = false,
}: MenuItemProps) => {
  const theme = useTheme();
  const handleMenuItemClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    event.preventDefault();
    event.stopPropagation();

    onClick?.(event);
  };

  return (
    <StyledHoverableMenuItemBase
      data-testid={testId ?? undefined}
      onClick={disabled ? undefined : handleMenuItemClick}
      disabled={disabled}
      className={className}
      accent={accent}
      isIconDisplayedOnHoverOnly={isIconDisplayedOnHoverOnly}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      focused={focused || selected}
    >
      <MenuItemLeftContent
        LeftIcon={LeftIcon ?? undefined}
        iconThemeColor={iconThemeColor}
        LeftComponent={LeftComponent}
        withIconContainer={withIconContainer}
        withIconContainerBackground={withIconContainerBackground}
        text={text}
        contextualText={contextualText}
        contextualTextPosition={contextualTextPosition}
        disabled={disabled}
      />

      <StyledMenuItemRightContent>
        {iconButtons && (
          <StyledMenuItemHoverableButtons
            hoverOnly={isIconDisplayedOnHoverOnly}
          >
            {iconButtons}
          </StyledMenuItemHoverableButtons>
        )}
        {isDefined(shortcut) && (
          <Shortcut shortcut={shortcut} sequenceJoinLabel={shortcutJoinLabel} />
        )}
        {RightIcon && (
          <RightIcon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        )}
        {RightComponent}
        {hasSubMenu && (
          <div
            {...stylex.props(
              styles.subMenuIcon,
              isSubMenuOpened && styles.subMenuIconOpened,
              disabled && styles.subMenuIconHidden,
            )}
          >
            <IconChevronRight
              size={theme.icon.size.sm}
              color={theme.font.color.light}
            />
          </div>
        )}
      </StyledMenuItemRightContent>
    </StyledHoverableMenuItemBase>
  );
};

const styles = stylex.create({
  subMenuIcon: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    transform: 'rotate(0deg)',
    transition: `transform calc(${animationDuration['--t-animation-duration-normal']} * 1s) ease-in-out`,
  },
  subMenuIconOpened: { transform: 'rotate(90deg)' },
  subMenuIconHidden: { visibility: 'hidden' },
});
