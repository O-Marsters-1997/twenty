import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import { timelineIconSlot } from '../../constants/TimelineIconSlotSize.stylex';

export const eventRowStyles = stylex.create({
  row: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  container: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    minHeight: timelineIconSlot.size,
  },
  content: {
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    minWidth: 0,
  },
  linkedRecord: {
    overflow: 'hidden',
    textDecoration: 'underline',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
});
