import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  colorTransparent,
  fontColor,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';

export const chipVars = stylex.defineVars({
  '--tw-chip-padding': spacing['--t-spacing-1'],
  '--tw-chip-max-width': '100%',
});

const disabled = ':is(:disabled, [aria-disabled="true"], [data-disabled])';
const enabled =
  ':not(:disabled):not([aria-disabled="true"]):not(:is([data-disabled]))';

const clickableBackground = (base: string, hover: string, active: string) => ({
  default: base,
  [`${enabled}:active`]: active,
  [`${enabled}:hover`]: { default: null, [media.hoverCapable]: hover },
});

export const chipStyles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: 'inherit',
    blockSize: spacing['--t-spacing-3'],
    borderRadius: borderRadius['--t-border-radius-sm-round'],
    borderStyle: 'none',
    boxSizing: 'content-box',
    color: {
      default: fontColor['--t-font-color-primary'],
      [disabled]: fontColor['--t-font-color-light'],
    },
    cursor: { default: null, [disabled]: 'not-allowed' },
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontStyle: 'inherit',
    fontWeight: 'inherit',
    gap: spacing['--t-spacing-1'],
    lineHeight: 'inherit',
    maxInlineSize: chipVars['--tw-chip-max-width'],
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: chipVars['--tw-chip-padding'],
    textDecoration: 'none',
    userSelect: 'none',
  },
  truncate: { overflow: 'hidden' },
  sizeMd: { blockSize: spacing['--t-spacing-4'] },
  shapeRound: { borderRadius: borderRadius['--t-border-radius-pill'] },
  colorSecondary: {
    color: {
      default: fontColor['--t-font-color-secondary'],
      [disabled]: fontColor['--t-font-color-light'],
    },
  },
  weightMedium: { fontWeight: fontWeight['--t-font-weight-medium'] },
  variantSoft: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  variantSolid: {
    backgroundColor: backgroundTransparent['--t-background-transparent-medium'],
  },
  clickableGhost: {
    backgroundColor: clickableBackground(
      'inherit',
      backgroundTransparent['--t-background-transparent-light'],
      backgroundTransparent['--t-background-transparent-medium'],
    ),
    cursor: { default: null, [disabled]: 'not-allowed', [enabled]: 'pointer' },
  },
  clickableSoft: {
    backgroundColor: clickableBackground(
      backgroundTransparent['--t-background-transparent-light'],
      backgroundTransparent['--t-background-transparent-medium'],
      backgroundTransparent['--t-background-transparent-strong'],
    ),
    cursor: { default: null, [disabled]: 'not-allowed', [enabled]: 'pointer' },
  },
  clickableSolid: {
    backgroundColor: clickableBackground(
      backgroundTransparent['--t-background-transparent-medium'],
      backgroundTransparent['--t-background-transparent-strong'],
      colorTransparent['--t-color-transparent-gray8'],
    ),
    cursor: { default: null, [disabled]: 'not-allowed', [enabled]: 'pointer' },
  },
  endElementDivider: {
    alignSelf: 'stretch',
    borderInlineStartColor: borderColor['--t-border-color-light'],
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: 1,
  },
  labelMd: { blockSize: spacing['--t-spacing-4'] },
});
