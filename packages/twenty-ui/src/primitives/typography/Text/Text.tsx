import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { type TextProps } from './types/TextProps';

export const Text = ({
  render,
  truncate,
  lineClamp,
  className,
  style,
  xstyle,
  ref,
  ...props
}: WithXstyle<TextProps>) => {
  const clampedLines =
    isDefined(lineClamp) && Number.isInteger(lineClamp) && lineClamp > 0
      ? lineClamp
      : undefined;
  const stylexProps = stylex.props(
    truncate && styles.truncate,
    isDefined(clampedLines) && styles.lineClamp,
    isDefined(clampedLines) && styles.lineClampCount(clampedLines),
    xstyle,
  );

  return useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylexProps, className),
      style: isDefined(stylexProps.style)
        ? { ...stylexProps.style, ...style }
        : style,
    },
  });
};

const styles = stylex.create({
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lineClamp: {
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
  },
  lineClampCount: (lineClamp: number) => ({ WebkitLineClamp: lineClamp }),
});
