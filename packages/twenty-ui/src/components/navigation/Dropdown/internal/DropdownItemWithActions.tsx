import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

import { IconCheck, IconChevronRight } from '@ui/icon';
import { listItemMarker } from '@ui/primitives/navigation/ListItem/ListItem.stylex';
import { listItemStyles } from '@ui/primitives/navigation/ListItem/ListItemStyles.stylex';
import { type ListItemProps } from '@ui/primitives/navigation/ListItem/types/ListItemProps';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import styles from '../Dropdown.module.scss';

const DROPDOWN_ITEM_SELECTOR = '[data-dropdown-item]';

type DropdownItemWithActionsProps = Pick<
  ListItemProps,
  | 'actions'
  | 'actionsVisibility'
  | 'color'
  | 'selected'
  | 'focused'
  | 'indicator'
  | 'disabled'
  | 'hasSubmenu'
> & {
  children: ReactNode;
};

export const DropdownItemWithActions = ({
  actions,
  actionsVisibility = 'hover',
  color = 'neutral',
  selected = false,
  focused = false,
  indicator = 'none',
  disabled = false,
  hasSubmenu = false,
  children,
}: DropdownItemWithActionsProps) => (
  <div
    {...mergeStylexProps(
      stylex.props(listItemMarker, listItemStyles.root),
      styles.itemWithActions,
    )}
    role="none"
    data-actions-visibility={actionsVisibility}
    data-color={color}
    data-selected={selected ? '' : undefined}
    data-highlighted={focused ? '' : undefined}
    data-indicator={indicator}
    data-disabled={disabled ? '' : undefined}
    onClick={(event) => {
      if (event.target !== event.currentTarget) {
        return;
      }

      event.currentTarget
        .querySelector<HTMLElement>(DROPDOWN_ITEM_SELECTOR)
        ?.click();
    }}
  >
    {children}
    <span
      {...mergeStylexProps(
        stylex.props(listItemStyles.actions),
        styles.itemActions,
      )}
    >
      {actions}
    </span>
    {indicator === 'check' && selected && (
      <IconCheck
        {...mergeStylexProps(
          stylex.props(listItemStyles.checkIndicator),
          styles.itemDecoration,
        )}
        aria-hidden
      />
    )}
    {hasSubmenu && (
      <IconChevronRight
        {...mergeStylexProps(
          stylex.props(listItemStyles.submenuIcon),
          styles.itemDecoration,
        )}
        aria-hidden
      />
    )}
  </div>
);
