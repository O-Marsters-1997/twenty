import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { spacing } from '../../../theme/tokens.stylex';
import { type RadioGroupProps } from './types/RadioGroupProps';

export const RadioGroup = <TValue,>({
  className,
  xstyle,
  ...props
}: RadioGroupProps<TValue>) => (
  <RadioGroupPrimitive
    {...props}
    {...mergeStylexProps(stylex.props(styles.root, xstyle), className)}
  />
);

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
});
