import * as stylex from '@stylexjs/stylex';

import { media } from '../../../../theme/constants.stylex';
import {
  background,
  borderColor,
  borderRadius,
  color,
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../../theme/tokens.stylex';
import { tabMarker } from './Tab.stylex';

const VERTICAL = ':is([data-orientation="vertical"])';

export const tabStyles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: {
      default: 'column',
      [VERTICAL]: 'row',
    },
    minInlineSize: 0,
  },
  list: {
    display: 'flex',
    flexDirection: {
      default: null,
      [VERTICAL]: 'column',
    },
    flexShrink: {
      default: null,
      [VERTICAL]: 0,
    },
    gap: spacing['--t-spacing-1'],
    minInlineSize: 0,
    position: 'relative',
    '::after': {
      backgroundColor: borderColor['--t-border-color-light'],
      blockSize: {
        default: '1px',
        [VERTICAL]: 'auto',
      },
      content: '""',
      inlineSize: {
        default: null,
        [VERTICAL]: '1px',
      },
      insetBlockEnd: 0,
      insetBlockStart: {
        default: null,
        [VERTICAL]: 0,
      },
      insetInlineEnd: 0,
      insetInlineStart: {
        default: 0,
        [VERTICAL]: 'auto',
      },
      pointerEvents: 'none',
      position: 'absolute',
    },
  },
  tab: {
    '--tw-tabs-color': {
      default: fontColor['--t-font-color-secondary'],
      ':is([data-disabled]:not([data-active]))':
        fontColor['--t-font-color-light'],
      ':is([data-active])': fontColor['--t-font-color-primary'],
    },
    '--tw-tabs-icon-color': {
      default: 'var(--tw-tabs-color)',
      ':is([data-disabled]:not([data-active]))':
        fontColor['--t-font-color-extra-light'],
    },
    '--tw-tabs-background': {
      default: 'transparent',
      [media.hoverCapable]: {
        default: null,
        ':hover:not(:is([data-disabled])):not(:active)':
          background['--t-background-tertiary'],
      },
      ':active:not(:is([data-disabled]))':
        background['--t-background-quaternary'],
    },
    '--tw-tabs-padding-block': {
      default: spacing['--t-spacing-1'],
      ':is([data-size="md"])': spacing['--t-spacing-2'],
    },
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderWidth: 0,
    color: 'var(--tw-tabs-color)',
    cursor: {
      default: 'pointer',
      ':is([data-disabled])': 'default',
    },
    display: 'flex',
    flexShrink: 0,
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: {
      default: 'center',
      [VERTICAL]: 'flex-start',
    },
    minBlockSize: spacing['--t-spacing-10'],
    minInlineSize: 0,
    paddingBlock: 0,
    paddingInline: 0,
    position: 'relative',
    textDecoration: 'none',
    userSelect: 'none',
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'var(--tw-tabs-background)',
    borderRadius: {
      default: borderRadius['--t-border-radius-md'],
      [stylex.when.ancestor(':is([data-highlighted])', tabMarker)]:
        borderRadius['--t-border-radius-sm'],
    },
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    inlineSize: '100%',
    minInlineSize: 0,
    outlineColor: {
      default: null,
      [stylex.when.ancestor(':is([data-highlighted])', tabMarker)]:
        color['--t-color-blue'],
    },
    outlineOffset: {
      default: null,
      [stylex.when.ancestor(':is([data-highlighted])', tabMarker)]: '-1px',
    },
    outlineStyle: {
      default: null,
      [stylex.when.ancestor(':is([data-highlighted])', tabMarker)]: 'solid',
    },
    outlineWidth: {
      default: null,
      [stylex.when.ancestor(':is([data-highlighted])', tabMarker)]: '1px',
    },
    paddingBlock: 'var(--tw-tabs-padding-block)',
    paddingInline: spacing['--t-spacing-2'],
    whiteSpace: 'nowrap',
  },
  label: {
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  startIcon: {
    alignItems: 'center',
    color: 'var(--tw-tabs-icon-color)',
    display: 'inline-flex',
    flexShrink: 0,
  },
  badge: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
  },
  panel: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minInlineSize: 0,
  },
  indicator: {
    backgroundColor: borderColor['--t-border-color-inverted'],
    blockSize: {
      default: '1px',
      [VERTICAL]: 'var(--active-tab-height)',
    },
    inlineSize: {
      default: 'var(--active-tab-width)',
      [VERTICAL]: '1px',
    },
    insetBlockEnd: {
      default: 0,
      [VERTICAL]: 'auto',
    },
    insetBlockStart: {
      default: null,
      [VERTICAL]: 'var(--active-tab-top)',
    },
    insetInlineEnd: {
      default: null,
      [VERTICAL]: 0,
    },
    insetInlineStart: {
      default: 'var(--active-tab-left)',
      ':dir(rtl)': 'var(--active-tab-right)',
      [VERTICAL]: 'auto',
      [`${VERTICAL}:dir(rtl)`]: 'auto',
    },
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 1,
  },
});
