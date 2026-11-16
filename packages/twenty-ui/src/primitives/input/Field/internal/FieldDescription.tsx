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
import { type FieldDescriptionProps } from '../types/FieldDescriptionProps';

export const FieldDescription = forwardRef<
  React.ElementRef<typeof FieldPrimitive.Description>,
  FieldDescriptionProps
>(({ className, xstyle, ...props }, ref) => (
  <FieldPrimitive.Description
    ref={ref}
    // oxlint-disable-next-line react/jsx-props-no-spreading
    {...props}
    {...mergeStylexProps(stylex.props(styles.description, xstyle), className)}
  />
));

FieldDescription.displayName = 'FieldDescription';

const styles = stylex.create({
  description: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    marginBlockEnd: 0,
    marginBlockStart: spacing['--t-spacing-0_5'],
    marginInline: 0,
  },
});
