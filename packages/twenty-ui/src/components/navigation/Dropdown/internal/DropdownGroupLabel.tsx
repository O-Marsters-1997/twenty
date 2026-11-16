import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { dropdownStyles } from '../Dropdown.stylex';

type DropdownGroupLabelProps = MenuPrimitive.GroupLabel.Props;

export const DropdownGroupLabel = ({
  className,
  ...props
}: DropdownGroupLabelProps) => (
  <MenuPrimitive.GroupLabel
    {...props}
    {...mergeStylexProps(stylex.props(dropdownStyles.groupLabel), className)}
  />
);
