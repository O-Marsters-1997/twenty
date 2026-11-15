import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { themeCssVariables } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { colorSampleStyles } from './ColorSample.stylex';
import { type ColorSampleProps } from './types/ColorSampleProps';

export const ColorSample = ({
  colorName,
  color,
  variant,
  className,
  style,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<ColorSampleProps>) => {
  const stylexProps = stylex.props(
    colorSampleStyles.root,
    variant === 'circle' && colorSampleStyles.circle,
    xstyle,
  );

  return useRender({
    defaultTagName: 'div',
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylexProps, className),
      style: {
        ...stylexProps.style,
        '--color-sample-color':
          color ?? themeCssVariables.tag.background[colorName],
        '--color-sample-border-color': themeCssVariables.tag.text[colorName],
        ...style,
      } as CSSProperties,
    },
  });
};
