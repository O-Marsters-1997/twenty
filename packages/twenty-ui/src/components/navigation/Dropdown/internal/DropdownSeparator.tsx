import * as stylex from '@stylexjs/stylex';
import { type ComponentPropsWithRef } from 'react';

import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { dropdownStyles } from '../Dropdown.stylex';

export const DropdownSeparator = ({
  className,
  ...props
}: ComponentPropsWithRef<'div'>) => (
  <MenuPrimitive.Separator
    {...props}
    role="separator"
    data-dropdown-separator=""
    {...mergeStylexProps(stylex.props(dropdownStyles.separator), className)}
  />
);
