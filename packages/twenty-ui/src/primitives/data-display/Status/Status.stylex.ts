import * as stylex from '@stylexjs/stylex';

import {
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';

export const statusVars = stylex.defineVars({
  '--tw-status-background': 'transparent',
  '--tw-status-text-color': fontColor['--t-font-color-secondary'],
});

const interactive = ':is(button, a, [role="button"], [role="link"])';
const disabled = ':is(:disabled, [aria-disabled="true"])';

export const statusStyles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: statusVars['--tw-status-background'],
    blockSize: spacing['--t-spacing-5'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'none',
    color: statusVars['--tw-status-text-color'],
    cursor: {
      default: null,
      [interactive]: 'pointer',
      [disabled]: 'not-allowed',
    },
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontStyle: 'normal',
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-1'],
    marginBlock: 0,
    marginInline: 0,
    opacity: { default: null, [disabled]: 0.5 },
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    '::before': {
      backgroundColor: statusVars['--tw-status-text-color'],
      blockSize: spacing['--t-spacing-1'],
      borderRadius: borderRadius['--t-border-radius-rounded'],
      content: '""',
      display: 'block',
      flexShrink: 0,
      inlineSize: spacing['--t-spacing-1'],
    },
  },
  weightMedium: { fontWeight: fontWeight['--t-font-weight-medium'] },
  loading: { paddingInlineEnd: spacing['--t-spacing-1'] },
  content: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});
