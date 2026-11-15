import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { isFunction } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { useTheme } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { stringToThemeColorP3String } from '@ui/utilities';

import { avatarSizeStyles, avatarStyles } from '../Avatar.stylex';
import { type AvatarRootProps } from '../types/AvatarRootProps';

import { getAvatarInitial } from './getAvatarInitial';

export const AvatarRoot = ({
  name,
  colorSeed = name,
  size = 'md',
  shape = 'square',
  variant = 'soft',
  color,
  backgroundColor,
  borderColor,
  pulsing = false,
  ring = false,
  className,
  style,
  xstyle,
  ...props
}: WithXstyle<AvatarRootProps>) => {
  const theme = useTheme();
  const initial = getAvatarInitial(name);
  const fallbackColor = initial
    ? (color ??
      stringToThemeColorP3String({
        string: colorSeed ?? '',
        variant: 12,
        theme,
      }))
    : (color ?? theme.font.color.tertiary);
  const fallbackBackground = initial
    ? (backgroundColor ??
      stringToThemeColorP3String({
        string: colorSeed ?? '',
        variant: variant === 'outline' ? 5 : 4,
        theme,
      }))
    : (backgroundColor ?? theme.background.transparent.light);
  const fallbackBorder =
    borderColor ??
    (initial
      ? stringToThemeColorP3String({
          string: colorSeed ?? '',
          variant: 6,
          theme,
        })
      : undefined);

  const stylexProps = stylex.props(
    avatarStyles.root,
    avatarSizeStyles[size],
    shape === 'rounded-square' && avatarStyles.shapeRoundedSquare,
    shape === 'circle' && avatarStyles.shapeCircle,
    ring && avatarStyles.ring,
    pulsing && avatarStyles.pulsing,
    xstyle,
  );

  return (
    <AvatarPrimitive.Root
      {...props}
      data-size={size}
      data-shape={shape}
      data-pulsing={pulsing || undefined}
      data-ring={ring || undefined}
      className={mergeStylexProps(stylexProps, className).className}
      style={(state) => {
        const borderColorValue =
          variant === 'outline' &&
          state.imageLoadingStatus !== 'loaded' &&
          fallbackBorder
            ? fallbackBorder
            : undefined;

        return {
          ...stylexProps.style,
          '--tw-avatar-color': fallbackColor,
          '--tw-avatar-background':
            state.imageLoadingStatus === 'loaded'
              ? 'transparent'
              : fallbackBackground,
          '--tw-avatar-border-color': borderColorValue ?? 'transparent',
          '--tw-avatar-border-width': borderColorValue ? '1px' : '0px',
          ...(isFunction(style) ? style(state) : style),
        } as CSSProperties;
      }}
    />
  );
};
