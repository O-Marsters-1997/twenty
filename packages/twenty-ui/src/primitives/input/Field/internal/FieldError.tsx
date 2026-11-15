import { Field as FieldPrimitive } from '@base-ui/react/field';
import * as stylex from '@stylexjs/stylex';
import { forwardRef } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../../theme/tokens.stylex';
import { type FieldErrorProps } from '../types/FieldErrorProps';

export const FieldError = forwardRef<
  React.ElementRef<typeof FieldPrimitive.Error>,
  FieldErrorProps
>(({ className, xstyle, ...props }, ref) => (
  <FieldPrimitive.Error
    ref={ref}
    // oxlint-disable-next-line react/jsx-props-no-spreading
    {...props}
    {...mergeStylexProps(stylex.props(styles.error, xstyle), className)}
  />
));

FieldError.displayName = 'FieldError';

const styles = stylex.create({
  error: {
    color: fontColor['--t-font-color-danger'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    marginBlockEnd: 0,
    marginBlockStart: spacing['--t-spacing-0_5'],
    marginInline: 0,
  },
});
