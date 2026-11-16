import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dropdownStyles } from '../Dropdown.stylex';

type DropdownGroupProps = WithXstyle<MenuPrimitive.Group.Props>;

export const DropdownGroup = ({
  className,
  xstyle,
  ...props
}: DropdownGroupProps) => (
  <MenuPrimitive.Group
    {...props}
    {...mergeStylexProps(stylex.props(dropdownStyles.group, xstyle), className)}
  />
);
