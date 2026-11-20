import { draggedRecordIdsComponentState } from '@/object-record/record-drag/states/draggedRecordIdsComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { Badge } from 'twenty-ui/primitives/data-display';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  badgeContainer: {
    display: 'flex',
    position: 'absolute',
    zIndex: 1000,
    right: '-7px',
    top: '-7px',
  },
});

export const RecordDragMultiDragCounterChip = () => {
  const draggedRecordIds = useAtomComponentStateValue(
    draggedRecordIdsComponentState,
  );

  if (draggedRecordIds.length <= 1) {
    return null;
  }

  return (
    <div {...stylex.props(styles.badgeContainer)}>
      <Badge size="xs" color="primary" shape="circle">
        {draggedRecordIds.length}
      </Badge>
    </div>
  );
};
