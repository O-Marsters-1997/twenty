import * as stylex from '@stylexjs/stylex';

import { media } from '../../../theme/constants.stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  font,
  fontColor,
  fontSize,
  fontWeight,
  general,
  iconSize,
  iconStroke,
  spacing,
} from '../../../theme/tokens.stylex';

export const dropdownSectionMarker = stylex.defineMarker();
export const dropdownItemWithActionsMarker = stylex.defineMarker();

const instantDuration = `calc(${animationDuration['--t-animation-duration-instant']} * 1s)`;

export const dropdownStyles = stylex.create({
  content: {
    '--tw-popover-padding': 0,
    boxSizing: 'border-box',
    gap: 0,
    maxBlockSize: 'var(--available-height)',
    overflowY: 'auto',
  },
  item: {
    backgroundColor: {
      default: null,
      ':focus-visible':
        backgroundTransparent['--t-background-transparent-light'],
    },
    maxInlineSize: {
      default: null,
      [stylex.when.ancestor(
        ':is([data-dropdown-columns])',
        dropdownSectionMarker,
      )]: '100%',
    },
    minInlineSize: {
      default: null,
      [stylex.when.ancestor(
        ':is([data-dropdown-columns])',
        dropdownSectionMarker,
      )]: 0,
    },
  },
  page: { display: 'contents' },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: general['--t-between-siblings-gap'],
  },
  groupLabel: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xxs'],
    gridColumn: {
      default: null,
      [stylex.when.ancestor(
        ':is([data-dropdown-columns])',
        dropdownSectionMarker,
      )]: '1 / -1',
    },
    marginInline: `calc(-1 * ${spacing['--t-spacing-1']})`,
    minBlockSize: 20,
    paddingInline: spacing['--t-spacing-2'],
    userSelect: 'none',
  },
  separator: {
    backgroundColor: borderColor['--t-border-color-light'],
    blockSize: 1,
    flex: 'none',
    marginInline: {
      default: 0,
      [stylex.when.ancestor(':is(*)', dropdownSectionMarker)]:
        `calc(-1 * ${spacing['--t-spacing-1']})`,
    },
  },
  section: {
    display: 'block',
    padding: {
      default: spacing['--t-spacing-1'],
      [stylex.when.ancestor(':is([data-scrollable])', dropdownSectionMarker)]:
        0,
    },
  },
  sectionColumns: { display: 'grid', gap: spacing['--t-spacing-0_5'] },
  sectionScrollable: { maxBlockSize: 176, overflowY: 'auto' },
  back: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    color: fontColor['--t-font-color-primary'],
    flex: 'none',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    minBlockSize: 33,
    paddingInline: spacing['--t-spacing-2'],
  },
  backIcon: {
    transform: { default: null, ':dir(rtl)': 'scaleX(-1)' },
  },
  searchContainer: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flex: 'none',
    minBlockSize: 36,
    paddingBlock: spacing['--t-spacing-2'],
  },
  search: {
    backgroundColor: 'transparent',
    blockSize: 'auto',
    borderRadius: 0,
    borderStyle: 'none',
    fontSize: fontSize['--t-font-size-sm'],
  },
  status: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    padding: spacing['--t-spacing-2'],
  },
  header: {
    alignItems: 'center',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flex: 'none',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    minBlockSize: 33,
    paddingInline: spacing['--t-spacing-2'],
  },
  title: {
    flex: 1,
    margin: 0,
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemWithActions: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      ':has(:focus-visible)':
        backgroundTransparent['--t-background-transparent-light'],
      [media.hoverCapable]: {
        default: null,
        ':hover': backgroundTransparent['--t-background-transparent-light'],
      },
    },
    borderStyle: 'none',
    borderRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-2'],
    inlineSize: '100%',
    minBlockSize: 32,
    outlineColor: {
      default: null,
      ':has(> [data-dropdown-item]:focus-visible)': color['--t-color-blue'],
    },
    outlineOffset: {
      default: null,
      ':has(> [data-dropdown-item]:focus-visible)': 1,
    },
    outlineStyle: {
      default: null,
      ':has(> [data-dropdown-item]:focus-visible)': 'solid',
    },
    outlineWidth: {
      default: null,
      ':has(> [data-dropdown-item]:focus-visible)': 2,
    },
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-1'],
    position: 'relative',
    textAlign: 'start',
    transition: `background ${instantDuration} ease`,
    userSelect: 'none',
  },
  itemWithActionsHighlighted: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  itemWithActionsDanger: {
    backgroundColor: {
      default: 'transparent',
      [media.hoverCapable]: {
        default: null,
        ':hover': backgroundTransparent['--t-background-transparent-danger'],
      },
    },
    color: fontColor['--t-font-color-danger'],
  },
  itemWithActionsDisabled: {
    backgroundColor: 'transparent',
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'default',
    transition: 'none',
  },
  itemWithActionsPrimary: {
    backgroundColor: 'transparent',
    color: 'inherit',
    flex: 1,
    minInlineSize: 0,
    outline: 'none',
    paddingInline: 0,
  },
  itemActions: {
    alignItems: 'center',
    display: 'inline-flex',
    flex: 'none',
    transition: `opacity ${instantDuration} ease`,
  },
  itemActionsHoverOnly: {
    opacity: {
      default: 1,
      [media.hoverCapableWithoutTouch]: {
        default: 0,
        [stylex.when.ancestor(':hover', dropdownItemWithActionsMarker)]: 1,
        [stylex.when.ancestor(
          ':has(:focus-visible)',
          dropdownItemWithActionsMarker,
        )]: 1,
      },
    },
  },
  itemDecoration: { pointerEvents: 'none' },
  checkIndicator: {
    blockSize: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    flex: 'none',
    inlineSize: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    strokeWidth: iconStroke['--t-icon-stroke-md'],
  },
  submenuIcon: {
    blockSize: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
    color: fontColor['--t-font-color-light'],
    flex: 'none',
    inlineSize: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
    strokeWidth: iconStroke['--t-icon-stroke-md'],
    transform: { default: null, ':dir(rtl)': 'scaleX(-1)' },
  },
  submenuIconHidden: { visibility: 'hidden' },
});
