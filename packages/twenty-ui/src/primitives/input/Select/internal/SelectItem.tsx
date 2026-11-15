import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import listItemStyles from '@ui/primitives/navigation/ListItem/ListItem.module.scss';
import { mergeClassNames } from '@ui/utilities/internal/mergeClassNames';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { type SelectItemProps } from '../types/SelectItemProps';

export const SelectItem = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SelectItemProps>) => (
  <SelectPrimitive.Item
    data-color="neutral"
    data-indicator="check"
    {...props}
    {...mergeStylexProps(
      stylex.props(styles.item, xstyle),
      mergeClassNames(listItemStyles.root, className),
    )}
  />
);

const styles = stylex.create({
  item: { boxSizing: 'border-box' },
});
