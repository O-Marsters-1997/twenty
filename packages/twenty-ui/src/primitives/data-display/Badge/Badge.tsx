import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import './Badge.css';
import { badgeStyles } from './Badge.stylex';
import { type BadgeProps } from './types/BadgeProps';

const sizeStyles = { sm: null, xs: badgeStyles.sizeXs, md: badgeStyles.sizeMd };

const colorStyles = {
  tertiary: null,
  inherit: badgeStyles.colorInherit,
  primary: badgeStyles.colorPrimary,
  secondary: badgeStyles.colorSecondary,
};

export const Badge = ({
  size = 'sm',
  color = 'tertiary',
  shape = 'pill',
  className,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<BadgeProps>) =>
  useRender({
    defaultTagName: 'span',
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(
        mergeStylexProps(
          stylex.props(
            badgeStyles.root,
            sizeStyles[size],
            colorStyles[color],
            shape === 'circle' && badgeStyles.shapeCircle,
            xstyle,
          ),
          'tw-badge',
        ),
        className,
      ),
      'data-badge-size': size,
      'data-badge-color': color,
      'data-badge-shape': shape,
    },
  });
