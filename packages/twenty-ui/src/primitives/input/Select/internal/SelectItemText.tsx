import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { listItemStyles } from '@ui/primitives/navigation/ListItem/ListItemStyles.stylex';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { type SelectItemTextProps } from '../types/SelectItemTextProps';

export const SelectItemText = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SelectItemTextProps>) => (
  <SelectPrimitive.ItemText
    {...props}
    {...mergeStylexProps(
      stylex.props(listItemStyles.label, listItemStyles.text, xstyle),
      className,
    )}
  />
);
