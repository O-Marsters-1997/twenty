import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

type EventCardProps = {
  children: React.ReactNode;
  isOpen: boolean;
};

const styles = stylex.create({
  cardContainer: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: '1',
    gap: spacing['--t-spacing-2'],
    maxWidth: { default: '400px', [media.mobile]: '300px' },
    paddingTop: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingInline: '0px',
    width: '100%',
  },
  cardInnerContainer: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    backgroundColor: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'center',
    overflow: 'hidden',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-2'],
  },
});

export const EventCard = ({ children, isOpen }: EventCardProps) => {
  return (
    isOpen && (
      <div {...stylex.props(styles.cardContainer)}>
        <div {...stylex.props(styles.cardInnerContainer)}>{children}</div>
      </div>
    )
  );
};
