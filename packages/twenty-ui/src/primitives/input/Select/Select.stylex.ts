import * as stylex from '@stylexjs/stylex';

import {
  borderColor,
  color,
  fontColor,
  spacing,
} from '../../../theme/tokens.stylex';

export const selectTriggerMarker = stylex.defineMarker();

export const selectTriggerStyles = stylex.create({
  trigger: {
    alignItems: 'center',
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus': {
        default: color['--t-color-blue'],
        ':is([aria-invalid="true"], [data-invalid])':
          borderColor['--t-border-color-danger'],
      },
      ':is([data-popup-open])': {
        default: color['--t-color-blue'],
        ':is([aria-invalid="true"], [data-invalid])':
          borderColor['--t-border-color-danger'],
      },
      ':is([aria-invalid="true"], [data-invalid])':
        borderColor['--t-border-color-danger'],
    },
    boxSizing: 'border-box',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':is([data-disabled])': fontColor['--t-font-color-tertiary'],
    },
    cursor: {
      default: 'pointer',
      ':is([data-disabled])': 'not-allowed',
    },
    display: 'inline-flex',
    gap: spacing['--t-spacing-2'],
    textAlign: 'start',
  },
  value: {
    color: {
      default: null,
      [stylex.when.ancestor(':is([data-placeholder])', selectTriggerMarker)]:
        fontColor['--t-font-color-light'],
    },
    flex: 1,
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  icon: { alignItems: 'center', display: 'inline-flex', flex: 'none' },
});
