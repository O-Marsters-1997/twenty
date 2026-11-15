import { type useRender } from '@base-ui/react/use-render';
import { type StyleXStyles } from '@stylexjs/stylex';

export type VisuallyHiddenProps = useRender.ComponentProps<'span'> & {
  xstyle?: StyleXStyles;
};
