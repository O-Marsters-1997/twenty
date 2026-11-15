import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { borderColor, spacing } from '../../../../theme/tokens.stylex';
import { type SelectSeparatorProps } from '../types/SelectSeparatorProps';

export const SelectSeparator = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SelectSeparatorProps>) => (
  <SelectPrimitive.Separator
    {...props}
    {...mergeStylexProps(stylex.props(styles.separator, xstyle), className)}
  />
);

const styles = stylex.create({
  separator: {
    background: borderColor['--t-border-color-light'],
    blockSize: 1,
    marginBlock: spacing['--t-spacing-1'],
  },
});
