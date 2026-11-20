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
    gap: spacing['--t-spacing-2'],
    paddingInline: '0px',
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: '1',
    maxWidth: { default: '400px', [media.mobile]: '300px' },
    paddingBottom: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-2'],
    width: '100%',
  },
  cardInnerContainer: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
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
