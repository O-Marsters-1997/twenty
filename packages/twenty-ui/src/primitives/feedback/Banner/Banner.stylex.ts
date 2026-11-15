import * as stylex from '@stylexjs/stylex';

import {
  backgroundTransparent,
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';

export const bannerStyles = stylex.create({
  root: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    fontFamily: 'Inter',
    fontSize: fontSize['--t-font-size-md'],
    fontStyle: 'normal',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-3'],
    inlineSize: '100%',
    justifyContent: 'center',
    lineHeight: '150%',
    minBlockSize: 40,
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-2'],
  },
  colorGray: {
    '--banner-solid-background': color['--t-color-gray'],
    '--banner-soft-background':
      backgroundTransparent['--t-background-transparent-secondary'],
    '--banner-soft-color': fontColor['--t-font-color-primary'],
  },
  colorBlue: {
    '--banner-solid-background': color['--t-color-blue'],
    '--banner-soft-background':
      backgroundTransparent['--t-background-transparent-blue'],
    '--banner-soft-color': color['--t-color-blue'],
  },
  colorGreen: {
    '--banner-solid-background': color['--t-color-green'],
    '--banner-soft-background':
      backgroundTransparent['--t-background-transparent-success'],
    '--banner-soft-color': color['--t-color-green'],
  },
  colorOrange: {
    '--banner-solid-background': color['--t-color-orange'],
    '--banner-soft-background':
      backgroundTransparent['--t-background-transparent-orange'],
    '--banner-soft-color': color['--t-color-orange'],
  },
  colorRed: {
    '--banner-solid-background': color['--t-color-red'],
    '--banner-soft-background':
      backgroundTransparent['--t-background-transparent-danger'],
    '--banner-soft-color': color['--t-color-red'],
  },
  variantSolid: {
    backdropFilter: 'blur(5px)',
    backgroundColor: 'var(--banner-solid-background)',
    color: fontColor['--t-font-color-inverted'],
  },
  variantSoft: {
    backdropFilter: 'none',
    backgroundColor: 'var(--banner-soft-background)',
    color: 'var(--banner-soft-color)',
  },
  slot: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
  },
});

export const bannerColorStyles = {
  gray: bannerStyles.colorGray,
  blue: bannerStyles.colorBlue,
  green: bannerStyles.colorGreen,
  orange: bannerStyles.colorOrange,
  red: bannerStyles.colorRed,
};

export const bannerActionStyles = stylex.create({
  action: {
    '--tw-button-active': 'color-mix(in srgb, currentColor 20%, transparent)',
    '--tw-button-background': 'transparent',
    '--tw-button-border': 'color-mix(in srgb, currentColor 25%, transparent)',
    '--tw-button-hover': 'color-mix(in srgb, currentColor 10%, transparent)',
    color: 'inherit',
  },
});
