import type * as stylex from '@stylexjs/stylex';
import { type ComponentProps, type MouseEvent, type ReactNode } from 'react';
import {
  type Dropdown,
  type MenuItemAccent,
} from 'twenty-ui/components/navigation';
import { type IconComponent } from 'twenty-ui/icon';

export type MenuItemWithOptionDropdownProps = {
  accent?: MenuItemAccent;
  xstyle?: stylex.StyleXStyles;
  dropdownContent: ReactNode;
  dropdownId: string;
  isIconDisplayedOnHoverOnly?: boolean;
  isTooltipOpen?: boolean;
  LeftIcon?: IconComponent | null;
  LeftComponent?: ReactNode;
  RightIcon?: IconComponent | null;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
  testId?: string;
  text: ReactNode;
  hasSubMenu?: boolean;
  dropdownSide?: ComponentProps<typeof Dropdown.Content>['side'];
  dropdownAlign?: ComponentProps<typeof Dropdown.Content>['align'];
  selected?: boolean;
};
