import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import { timelineIconSlot } from '../../constants/TimelineIconSlotSize.stylex';

export const eventRowStyles = stylex.create({
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    width: '100%',
  },
  container: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'space-between',
    minHeight: timelineIconSlot.size,
  },
  content: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    minWidth: 0,
    overflow: 'hidden',
  },
  linkedRecord: {
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    overflow: 'hidden',
    textDecoration: 'underline',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
});
