import { draggedRecordIdsComponentState } from '@/object-record/record-drag/states/draggedRecordIdsComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import * as stylex from '@stylexjs/stylex';
import {
  accent,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

const MAX_STACK_CARDS = 5;

const styles = stylex.create({
  card: {
    backgroundColor: accent['--t-accent-tertiary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    height: '100%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  cardOffset: (offset: number) => ({
    top: `${offset === 1 ? 2 : (offset - 1) * 4 + 2}px`,
    zIndex: -offset,
  }),
});

export const RecordDragMultiDragStack = () => {
  const draggedRecordIds = useAtomComponentStateValue(
    draggedRecordIdsComponentState,
  );

  if (draggedRecordIds.length <= 1) {
    return null;
  }

  return Array.from({
    length: Math.min(MAX_STACK_CARDS, draggedRecordIds.length - 1),
  }).map((_, index) => (
    <div
      key={index}
      {...stylex.props(styles.card, styles.cardOffset(index + 1))}
    />
  ));
};
