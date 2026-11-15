import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderRadius,
  font,
  fontColor,
  fontSize,
  fontWeight,
  iconSize,
  iconStroke,
  spacing,
} from '../../../theme/tokens.stylex';
import { listItemMarker } from './ListItem.stylex';

export const listItemStyles = stylex.create({
  root: {
    alignItems: 'center',
    appearance: 'none',
    '--tw-list-item-background': {
      default: 'transparent',
      [media.hoverCapable]: {
        default: null,
        ':hover:not(:is([data-highlighted], [data-selected][data-indicator="none"]))':
          'var(--tw-list-item-hover-background)',
      },
      ':is([data-highlighted], [data-selected][data-indicator="none"])':
        backgroundTransparent['--t-background-transparent-light'],
    },
    '--tw-list-item-color': {
      default: fontColor['--t-font-color-secondary'],
      ':is([data-color="danger"]:not([data-disabled]))':
        fontColor['--t-font-color-danger'],
      ':is([data-disabled])': fontColor['--t-font-color-tertiary'],
    },
    '--tw-list-item-description-color': {
      default: fontColor['--t-font-color-secondary'],
      ':is([data-disabled])': fontColor['--t-font-color-light'],
    },
    '--tw-list-item-hover-background': {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':is([data-color="danger"]:not([data-disabled]))':
        backgroundTransparent['--t-background-transparent-danger'],
      ':is([data-disabled])': 'transparent',
    },
    backgroundColor: 'var(--tw-list-item-background)',
    borderStyle: 'none',
    borderWidth: 0,
    borderRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    boxSizing: 'border-box',
    color: 'var(--tw-list-item-color)',
    cursor: {
      default: 'pointer',
      ':is([data-disabled])': 'default',
    },
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-2'],
    inlineSize: '100%',
    minBlockSize: '32px',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-1'],
    position: 'relative',
    textAlign: 'start',
    textDecoration: 'none',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-instant']} * 1s)`,
    transitionProperty: {
      default: 'background-color',
      ':is([data-disabled])': 'none',
    },
    transitionTimingFunction: 'ease',
    userSelect: 'none',
  },
  icon: {
    alignItems: 'center',
    display: {
      default: 'inline-flex',
      ':empty': 'none',
    },
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
  },
  label: {
    alignItems: 'baseline',
    display: 'flex',
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing['--t-spacing-1'],
    minInlineSize: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  text: {
    display: 'block',
    flexShrink: 0,
    maxInlineSize: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  description: {
    color: 'var(--tw-list-item-description-color)',
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  inlineDescription: {
    '::before': {
      content: '"·"',
      marginInlineEnd: spacing['--t-spacing-1'],
    },
  },
  endDescription: {
    flexShrink: 1,
    textAlign: 'end',
  },
  hotkeys: {
    display: 'inline-flex',
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-sm'],
  },
  actions: {
    alignItems: 'center',
    display: 'inline-flex',
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    opacity: {
      default: null,
      [media.hoverCapableWithoutTouch]: {
        default: 0,
        [stylex.when.ancestor(
          ':is([data-actions-visibility="always"], :hover, :focus-within)',
          listItemMarker,
        )]: 1,
      },
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-instant']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease',
  },
  checkIndicator: {
    blockSize: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    inlineSize: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    strokeWidth: iconStroke['--t-icon-stroke-md'],
  },
  submenuIcon: {
    blockSize: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
    color: fontColor['--t-font-color-light'],
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    inlineSize: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
    strokeWidth: iconStroke['--t-icon-stroke-md'],
    transform: {
      default: null,
      ':dir(rtl)': 'scaleX(-1)',
    },
    visibility: {
      default: null,
      [stylex.when.ancestor(':is([data-disabled])', listItemMarker)]: 'hidden',
    },
  },
});
