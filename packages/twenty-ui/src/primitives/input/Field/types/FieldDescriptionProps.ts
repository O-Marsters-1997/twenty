import { type Field as FieldPrimitive } from '@base-ui/react/field';
import { type StyleXStyles } from '@stylexjs/stylex';

export type FieldDescriptionProps = FieldPrimitive.Description.Props & {
  xstyle?: StyleXStyles;
};
