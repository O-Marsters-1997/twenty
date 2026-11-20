import { recordDetailRecordsListItemMarker } from './RecordDetailRecordsListItemContainer.stylex';
import * as stylex from '@stylexjs/stylex';
import { animationDuration } from 'twenty-ui/theme/tokens.stylex';

const isItemHovered = stylex.when.ancestor(
  ':hover',
  recordDetailRecordsListItemMarker,
);
const isItemFocused = stylex.when.ancestor(
  ':focus-within',
  recordDetailRecordsListItemMarker,
);

export const recordDetailDisplayOnHoverStyles = stylex.create({
  base: {
    opacity: {
      default: 0,
      [isItemFocused]: 1,
      [isItemHovered]: 1,
    },
    pointerEvents: {
      default: 'none',
      [isItemFocused]: 'auto',
      [isItemHovered]: 'auto',
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-instant']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease',
  },
  dropdownOpen: {
    opacity: 1,
    pointerEvents: 'auto',
  },
});
