import * as stylex from '@stylexjs/stylex';
import { type MouseEvent, type RefObject } from 'react';
import { borderRadius, color } from 'twenty-ui/theme/tokens.stylex';

import { EMAIL_RECIPIENT_DND_TYPE } from '@/activities/emails/recipients/constants/EmailRecipientDndType';
import { EmailRecipientsFieldChip } from '@/activities/emails/recipients/components/EmailRecipientsFieldChip';
import { type EmailRecipientResolution } from '@/activities/emails/recipients/hooks/useEmailRecipientsResolution';
import { type EmailRecipientDragData } from '@/activities/emails/recipients/types/EmailRecipientDragData';
import { type EmailRecipient } from '@/activities/emails/recipients/types/EmailRecipient';
import { type EmailRecipientsFieldId } from '@/activities/emails/recipients/types/EmailRecipientsFieldId';
import { DragDropItemSortableCell } from '@/ui/utilities/drag-and-drop/components/DragDropItemSortableCell';

import { type EmailRecipientChipDropEdge } from '@/activities/emails/recipients/types/EmailRecipientChipDropEdge';

const DROP_INDICATOR_WIDTH = '2px';
// Centers the bar in the 4px chip gap: half the gap plus half the bar.
const DROP_INDICATOR_OFFSET = '-3px';

// Absolute so showing the bar never reflows the wrapping chip row mid-drag.
const styles = stylex.create({
  chipDropZone: {
    position: 'relative',
    '::after': {
      backgroundColor: color['--t-color-blue'],
      borderRadius: borderRadius['--t-border-radius-pill'],
      bottom: 0,
      content: '""',
      cornerShape: 'round',
      opacity: 0,
      position: 'absolute',
      right: DROP_INDICATOR_OFFSET,
      top: 0,
      transitionDuration: '120ms',
      transitionProperty: 'opacity',
      transitionTimingFunction: 'ease-out',
      width: DROP_INDICATOR_WIDTH,
    },
    '::before': {
      backgroundColor: color['--t-color-blue'],
      borderRadius: borderRadius['--t-border-radius-pill'],
      bottom: 0,
      content: '""',
      cornerShape: 'round',
      left: DROP_INDICATOR_OFFSET,
      opacity: 0,
      position: 'absolute',
      top: 0,
      transitionDuration: '120ms',
      transitionProperty: 'opacity',
      transitionTimingFunction: 'ease-out',
      width: DROP_INDICATOR_WIDTH,
    },
  },
  dropBefore: {
    '::before': { opacity: 1 },
  },
  dropAfter: {
    '::after': { opacity: 1 },
  },
});

type EmailRecipientsFieldChipCellProps = {
  chipId: string;
  chipIndex: number;
  dropdownId: string;
  inputRef: RefObject<HTMLInputElement | null>;
  dropEdge: EmailRecipientChipDropEdge;
  fieldId: EmailRecipientsFieldId;
  isFlashing: boolean;
  isInvalid: boolean;
  isSelected: boolean;
  onEdit: () => void;
  onExtendSelectionTo: () => void;
  onRemove: () => void;
  onToggleSelection: () => void;
  recipient: EmailRecipient;
  resolution: EmailRecipientResolution | undefined;
  selectedIndices: number[];
  sortableId: string;
};

export const EmailRecipientsFieldChipCell = ({
  chipId,
  chipIndex,
  dropdownId,
  inputRef,
  dropEdge,
  fieldId,
  isFlashing,
  isInvalid,
  isSelected,
  onEdit,
  onExtendSelectionTo,
  onRemove,
  onToggleSelection,
  recipient,
  resolution,
  selectedIndices,
  sortableId,
}: EmailRecipientsFieldChipCellProps) => {
  const dragData: EmailRecipientDragData = {
    fieldId,
    index: chipIndex,
    selectedIndices,
  };

  // Capture phase keeps a shift/cmd click from opening the chip's dropdown.
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      onExtendSelectionTo();
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      onToggleSelection();
    }
  };

  return (
    <DragDropItemSortableCell
      accept={EMAIL_RECIPIENT_DND_TYPE}
      data={dragData}
      group={fieldId}
      id={sortableId}
      index={chipIndex}
      orientation="vertical"
      type={EMAIL_RECIPIENT_DND_TYPE}
    >
      <div
        {...stylex.props(
          styles.chipDropZone,
          dropEdge === 'before' && styles.dropBefore,
          dropEdge === 'after' && styles.dropAfter,
        )}
        onClickCapture={handleClickCapture}
        // Keeps focus in the input so chip keyboard navigation survives a click.
        onMouseDown={(event) => event.preventDefault()}
      >
        <EmailRecipientsFieldChip
          chipId={chipId}
          dropdownId={dropdownId}
          inputRef={inputRef}
          recipient={recipient}
          resolution={resolution}
          isInvalid={isInvalid}
          selected={isSelected}
          isFlashing={isFlashing}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>
    </DragDropItemSortableCell>
  );
};
