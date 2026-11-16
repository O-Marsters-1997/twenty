import { isNonEmptyString } from '@sniptt/guards';
import type * as stylex from '@stylexjs/stylex';

export const mergeClassName = (
  stylexProps: ReturnType<typeof stylex.props>,
  className?: string,
) => ({
  ...stylexProps,
  className:
    [stylexProps.className, className].filter(isNonEmptyString).join(' ') ||
    undefined,
});
