import * as stylex from '@stylexjs/stylex';

import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';

export const tagVars = stylex.defineVars({
  '--tw-tag-background': 'transparent',
  '--tw-tag-text': fontColor['--t-font-color-secondary'],
  '--tw-tag-border-style': 'solid',
});

const interactive = ':is(button, a, [role="button"], [role="link"])';
const disabled = ':is(:disabled, [aria-disabled="true"])';

export const tagStyles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: tagVars['--tw-tag-background'],
    blockSize: spacing['--t-spacing-5'],
    borderRadius: borderRadius['--t-border-radius-sm-round'],
    borderStyle: 'none',
    boxSizing: 'content-box',
    color: tagVars['--tw-tag-text'],
    cursor: {
      default: null,
      [interactive]: 'pointer',
      [disabled]: 'not-allowed',
    },
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-1'],
    marginBlock: 0,
    marginInline: 0,
    minInlineSize: 0,
    opacity: { default: null, [disabled]: 0.5 },
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    textAlign: 'inherit',
  },
  weightMedium: { fontWeight: fontWeight['--t-font-weight-medium'] },
  variantOutline: {
    borderColor: borderColor['--t-border-color-strong'],
    borderStyle: tagVars['--tw-tag-border-style'],
    borderWidth: 1,
  },
  variantGhost: { backgroundColor: 'transparent' },
  variantSolid: {
    backgroundColor: tagVars['--tw-tag-text'],
    color: background['--t-background-primary'],
  },
  content: {
    minInlineSize: 0,
    whiteSpace: 'nowrap',
  },
  contentTruncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  overflowingText: { display: 'block' },
  iconContainer: {
    display: 'flex',
    flexShrink: 0,
  },
});
