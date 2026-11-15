import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { spacing } from '../../../../theme/tokens.stylex';
import { type NumberFieldGroupProps } from '../types/NumberFieldGroupProps';

export const NumberFieldGroup = ({
  className,
  xstyle,
  ...props
}: WithXstyle<NumberFieldGroupProps>) => (
  <NumberFieldPrimitive.Group
    {...props}
    {...mergeStylexProps(stylex.props(styles.group, xstyle), className)}
  />
);

const styles = stylex.create({
  group: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing['--t-spacing-1'],
  },
});
