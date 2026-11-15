import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { IconChevronDown } from '@ui/icon';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import '../Select.css';
import { type SelectIconProps } from '../types/SelectIconProps';

export const SelectIcon = ({
  className,
  xstyle,
  children = <IconChevronDown />,
  ...props
}: WithXstyle<SelectIconProps>) => (
  <SelectPrimitive.Icon
    {...props}
    {...mergeStylexProps(stylex.props(styles.icon, xstyle), [
      'tw-select-icon',
      typeof className === 'string' ? className : undefined,
    ].filter(Boolean).join(' '))}
  >
    {children}
  </SelectPrimitive.Icon>
);

const styles = stylex.create({
  icon: { alignItems: 'center', display: 'inline-flex', flex: 'none' },
});
