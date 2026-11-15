import { RecordIndexRemoveSortingModal } from '@/object-record/record-index/components/RecordIndexRemoveSortingModal';
import { hasRecordGroupsComponentSelector } from '@/object-record/record-group/states/selectors/hasRecordGroupsComponentSelector';
import { RecordListBody } from '@/object-record/record-list/components/RecordListBody';
import { RecordListDragDropProvider } from '@/object-record/record-list/components/RecordListDragDropProvider';
import { RecordListFieldTooltip } from '@/object-record/record-list/components/RecordListFieldTooltip';
import { RecordListRecordGroupsBody } from '@/object-record/record-list/components/RecordListRecordGroupsBody';
import { RecordListResponsiveFieldsEffect } from '@/object-record/record-list/components/RecordListResponsiveFieldsEffect';
import { RecordListSSESubscribeEffect } from '@/object-record/record-list/components/RecordListSSESubscribeEffect';
import { RecordListComponentInstanceContext } from '@/object-record/record-list/states/contexts/RecordListComponentInstanceContext';
import { RecordSelectionEscapeHotkeyEffect } from '@/object-record/record-selection/components/RecordSelectionEscapeHotkeyEffect';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-1'],
  },
});

export const RecordList = () => {
  const recordListId = useAvailableComponentInstanceIdOrThrow(
    RecordListComponentInstanceContext,
  );

  const hasRecordGroups = useAtomComponentSelectorValue(
    hasRecordGroupsComponentSelector,
  );

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);

  return (
    <div ref={setContainerElement} {...stylex.props(styles.container)}>
      <RecordListResponsiveFieldsEffect containerElement={containerElement} />
      <RecordSelectionEscapeHotkeyEffect />
      <RecordListSSESubscribeEffect />
      <RecordIndexRemoveSortingModal />
      <RecordListFieldTooltip>
        <ScrollWrapper
          componentInstanceId={`scroll-wrapper-record-list-${recordListId}`}
          defaultEnableXScroll={false}
        >
          <RecordListDragDropProvider>
            {hasRecordGroups ? (
              <RecordListRecordGroupsBody />
            ) : (
              <RecordListBody />
            )}
          </RecordListDragDropProvider>
        </ScrollWrapper>
      </RecordListFieldTooltip>
    </div>
  );
};
