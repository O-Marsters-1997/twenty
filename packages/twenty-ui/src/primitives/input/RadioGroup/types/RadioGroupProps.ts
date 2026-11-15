import { type RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { type StyleXStyles } from '@stylexjs/stylex';

export type RadioGroupProps<TValue = string> =
  RadioGroupPrimitive.Props<TValue> & {
    xstyle?: StyleXStyles;
  };
