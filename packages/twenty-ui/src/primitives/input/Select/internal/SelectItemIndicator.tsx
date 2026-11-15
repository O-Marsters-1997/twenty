import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { IconCheck } from '@ui/icon';
import listItemStyles from '@ui/primitives/navigation/ListItem/ListItem.module.scss';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { type SelectItemIndicatorProps } from '../types/SelectItemIndicatorProps';

export const SelectItemIndicator = ({
  className,
  xstyle,
  children = <IconCheck className={listItemStyles.checkIndicator} />,
  ...props
}: WithXstyle<SelectItemIndicatorProps>) => (
  <SelectPrimitive.ItemIndicator
    {...props}
    {...mergeStylexProps(stylex.props(styles.indicator, xstyle), className)}
  >
    {children}
  </SelectPrimitive.ItemIndicator>
);

const styles = stylex.create({
  indicator: { alignItems: 'center', display: 'inline-flex', flex: 'none' },
});
