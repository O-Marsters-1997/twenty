import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

import { IconCheck, IconChevronRight } from '@ui/icon';
import { type ListItemProps } from '@ui/primitives/navigation/ListItem/types/ListItemProps';

import {
  dropdownItemWithActionsMarker,
  dropdownStyles,
} from '../Dropdown.stylex';

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
    {...stylex.props(
      dropdownItemWithActionsMarker,
      dropdownStyles.itemWithActions,
      (focused || (selected && indicator === 'none')) &&
        dropdownStyles.itemWithActionsHighlighted,
      color === 'danger' && dropdownStyles.itemWithActionsDanger,
      disabled && dropdownStyles.itemWithActionsDisabled,
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
      {...stylex.props(
        dropdownStyles.itemActions,
        actionsVisibility === 'hover' && dropdownStyles.itemActionsHoverOnly,
      )}
    >
      {actions}
    </span>
    {indicator === 'check' && selected && (
      <IconCheck
        {...stylex.props(
          dropdownStyles.checkIndicator,
          dropdownStyles.itemDecoration,
        )}
        aria-hidden
      />
    )}
    {hasSubmenu && (
      <IconChevronRight
        {...stylex.props(
          dropdownStyles.submenuIcon,
          dropdownStyles.itemDecoration,
          disabled && dropdownStyles.submenuIconHidden,
        )}
        aria-hidden
      />
    )}
  </div>
);
