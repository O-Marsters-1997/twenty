import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  headingColorStyles,
  headingSizeStyles,
  headingStyles,
} from './Heading.stylex';
import { type HeadingProps } from './types/HeadingProps';

export const Heading = ({
  level = 2,
  size = 'md',
  color = 'primary',
  render,
  ref,
  className,
  xstyle,
  ...props
}: WithXstyle<HeadingProps>) =>
  useRender({
    defaultTagName: `h${level}`,
    render,
    ref,
    props: {
      ...props,
      'data-size': size,
      'data-color': color,
      ...mergeStylexProps(
        stylex.props(
          headingStyles.root,
          headingSizeStyles[size],
          headingColorStyles[color],
          xstyle,
        ),
        className,
      ),
    },
  });
