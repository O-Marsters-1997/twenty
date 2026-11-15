import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { themeCssVariables } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { loaderStyles } from './Loader.stylex';
import { type LoaderProps } from './types/LoaderProps';

export const Loader = ({
  color,
  className,
  style,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<LoaderProps>) => {
  const loaderColor = isDefined(color)
    ? themeCssVariables.tag.text[color]
    : undefined;
  const stylexProps = stylex.props(
    loaderStyles.container,
    isDefined(loaderColor) && loaderStyles.containerColor(loaderColor),
    xstyle,
  );

  return useRender({
    defaultTagName: 'div',
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylexProps, className),
      style: { ...stylexProps.style, ...style } as CSSProperties,
      children: (
        <span
          {...stylex.props(
            loaderStyles.dot,
            isDefined(loaderColor) && loaderStyles.dotColor(loaderColor),
          )}
          aria-hidden="true"
        />
      ),
    },
  });
};
