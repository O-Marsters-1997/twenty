import { type Field as FieldPrimitive } from '@base-ui/react/field';
import { type StyleXStyles } from '@stylexjs/stylex';

export type FieldErrorProps = FieldPrimitive.Error.Props & {
  xstyle?: StyleXStyles;
};
