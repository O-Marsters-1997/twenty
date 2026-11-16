import { Field as FieldPrimitive } from '@base-ui/react/field';
import * as stylex from '@stylexjs/stylex';
import { forwardRef } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import {
  fontColor,
  fontWeight,
  spacing,
} from '../../../../theme/tokens.stylex';
import { type FieldLabelProps } from '../types/FieldLabelProps';

export const FieldLabel = forwardRef<
  React.ElementRef<typeof FieldPrimitive.Label>,
  FieldLabelProps
>(({ className, xstyle, ...props }, ref) => (
  <FieldPrimitive.Label
    ref={ref}
    // oxlint-disable-next-line react/jsx-props-no-spreading
    {...props}
    {...mergeStylexProps(stylex.props(styles.label, xstyle), className)}
  />
));

FieldLabel.displayName = 'FieldLabel';

const styles = stylex.create({
  label: {
    color: fontColor['--t-font-color-light'],
    display: 'block',
    fontSize: 11,
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBlockEnd: spacing['--t-spacing-1'],
  },
});
