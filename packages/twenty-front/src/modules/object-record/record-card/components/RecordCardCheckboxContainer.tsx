import { recordCardMarker } from './RecordCardMarker.stylex';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const isCardHovered = stylex.when.ancestor(':hover', recordCardMarker);
const isCardSelected = stylex.when.ancestor(
  ':is([data-selected="true"])',
  recordCardMarker,
);

const styles = stylex.create({
  container: {
    flexShrink: 0,
    marginLeft: 'auto',
    maxWidth: {
      default: '0',
      [isCardHovered]: spacing['--t-spacing-6'],
      [isCardSelected]: spacing['--t-spacing-6'],
    },
    opacity: {
      default: 0,
      [isCardHovered]: 1,
      [isCardSelected]: 1,
    },
    overflow: 'hidden',
    pointerEvents: {
      default: 'none',
      [isCardHovered]: 'auto',
      [isCardSelected]: 'auto',
    },
    transitionDuration: '160ms',
    transitionProperty: 'all',
    transitionTimingFunction: 'ease-in-out',
  },
});

export const RecordCardCheckboxContainer = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.container)}>{children}</div>;
