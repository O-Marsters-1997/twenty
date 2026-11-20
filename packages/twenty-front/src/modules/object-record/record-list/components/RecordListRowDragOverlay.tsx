import { type Draggable } from '@dnd-kit/dom';
import { isDefined } from 'twenty-shared/utils';

import { RecordDragMultiDragCounterChip } from '@/object-record/record-drag/components/RecordDragMultiDragCounterChip';
import { type RecordDragData } from '@/object-record/record-drag/types/RecordDragData';
import { RecordListRow } from '@/object-record/record-list/components/RecordListRow';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  rowDragOverlay: {
    background: background['--t-background-secondary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    position: 'relative',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
  },
});

type RecordListRowDragOverlayProps = {
  source: Draggable | null;
};

export const RecordListRowDragOverlay = ({
  source,
}: RecordListRowDragOverlayProps) => {
  const sourceData = source?.data as RecordDragData | undefined;

  if (!isDefined(sourceData)) {
    return null;
  }

  return (
    <div {...stylex.props(styles.rowDragOverlay)}>
      <RecordListRow recordId={sourceData.recordId} />
      <RecordDragMultiDragCounterChip />
    </div>
  );
};
