import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { menuItemMarker } from '@/ui/navigation/menu-item/components/MenuItemWithOptionDropdown.stylex';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { type MouseEvent } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { IconDotsVertical } from 'twenty-ui/icon';
import { ListItem } from 'twenty-ui/primitives/navigation';
import { useTheme } from 'twenty-ui/theme';
import {
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type MenuItemWithOptionDropdownProps } from './types/MenuItemWithOptionDropdownProps';

const HOVER_FINE_POINTER = '@media (hover: hover) and (pointer: fine)';

const styles = stylex.create({
  container: {
    borderRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    gap: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-1'],
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    boxSizing: 'border-box',
    display: 'flex',
    minWidth: 0,
    width: '100%',
  },
  containerFocused: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  primaryItem: {
    paddingInline: 0,
    backgroundColor: 'transparent',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  hoverableButtons: {
    display: 'flex',
    opacity: {
      [HOVER_FINE_POINTER]: {
        default: 0,
        [stylex.when.ancestor(':focus-within', menuItemMarker)]: 1,
        [stylex.when.ancestor(':hover', menuItemMarker)]: 1,
      },
      default: null,
    },
  },
  hoverableButtonsVisible: {
    opacity: {
      [HOVER_FINE_POINTER]: 1,
      default: null,
    },
  },
});

export const MenuItemWithOptionDropdown = ({
  accent = 'default',
  xstyle,
  isIconDisplayedOnHoverOnly = true,
  dropdownContent,
  dropdownId,
  LeftIcon,
  LeftComponent,
  RightIcon,
  onClick,
  onMouseEnter,
  onMouseLeave,
  testId,
  text,
  hasSubMenu = false,
  dropdownSide = 'bottom',
  dropdownAlign = 'end',
  selected = false,
}: MenuItemWithOptionDropdownProps) => {
  const theme = useTheme();
  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    dropdownId,
  );
  const handleMenuItemClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.(event);
  };

  const showActions = !isIconDisplayedOnHoverOnly || isDropdownOpen;

  return (
    <div
      data-testid={testId ?? undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...stylex.props(
        menuItemMarker,
        styles.container,
        selected && styles.containerFocused,
        xstyle,
      )}
    >
      <ListItem
        {...stylex.props(styles.primaryItem)}
        render={
          isDefined(onClick) ? (
            <button type="button" onClick={handleMenuItemClick} />
          ) : undefined
        }
        color={accent === 'danger' ? 'danger' : 'neutral'}
        focused={selected}
        startIcon={
          LeftComponent ??
          (isDefined(LeftIcon) && <LeftIcon size={theme.icon.size.md} />)
        }
        hasSubmenu={hasSubMenu}
      >
        {text}
      </ListItem>
      <div
        {...stylex.props(
          styles.hoverableButtons,
          showActions && styles.hoverableButtonsVisible,
        )}
      >
        <DropdownRoot dropdownId={dropdownId} type="menu">
          <Dropdown.Trigger
            onClick={(event) => event.stopPropagation()}
            render={
              <LightIconButton
                size="sm"
                emphasis="subtle"
                aria-label={t`More options`}
              >
                {isDefined(RightIcon) ? <RightIcon /> : <IconDotsVertical />}
              </LightIconButton>
            }
          />
          <DropdownContent
            side={dropdownSide}
            align={dropdownAlign}
            onClick={(event) => event.stopPropagation()}
          >
            {dropdownContent}
          </DropdownContent>
        </DropdownRoot>
      </div>
    </div>
  );
};
