import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { RecordBoardCardContext } from '@/object-record/record-board/record-board-card/contexts/RecordBoardCardContext';
import { isRecordSelectedComponentFamilyState } from '@/object-record/record-selection/states/isRecordSelectedComponentFamilyState';
import { useToggleRecordSelection } from '@/object-record/record-selection/hooks/useToggleRecordSelection';
import { t } from '@lingui/core/macro';

import { RecordChip } from '@/object-record/components/RecordChip';
import { useActiveRecordBoardCard } from '@/object-record/record-board/hooks/useActiveRecordBoardCard';
import { useFocusedRecordBoardCard } from '@/object-record/record-board/hooks/useFocusedRecordBoardCard';
import { StopPropagationContainer } from '@/object-record/record-board/record-board-card/components/StopPropagationContainer';
import { recordBoardCardIsExpandedComponentState } from '@/object-record/record-board/record-board-card/states/recordBoardCardIsExpandedComponentState';
import { RecordCardHeaderContainer } from '@/object-record/record-card/components/RecordCardHeaderContainer';
import { useOpenRecordFromIndexView } from '@/object-record/record-index/hooks/useOpenRecordFromIndexView';
import { useResolveOpenRecordIn } from '@/object-record/record-index/hooks/useResolveOpenRecordIn';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useGetCurrentViewOnly } from '@/views/hooks/useGetCurrentViewOnly';
import { RecordCardCheckboxContainer } from '@/object-record/record-card/components/RecordCardCheckboxContainer';
import { recordCardMarker } from '../../../record-card/components/RecordCardMarker.stylex';
import { useContext } from 'react';
import { OpenRecordIn } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconEye, IconEyeOff } from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/primitives/input';
import { useIsMobile, useIsTouchDevice } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  compactIconContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', recordCardMarker)]: 1,
    },
    transitionDuration: '160ms',
    transitionProperty: 'all',
    transitionTimingFunction: 'ease-in-out',
    marginLeft: spacing['--t-spacing-1'],
  },
  recordChipContainer: {
    flex: '1 1 auto',
    overflow: 'hidden',
    display: 'flex',
  },
});

export const RecordBoardCardHeader = () => {
  const { recordId } = useContext(RecordBoardCardContext);

  const { objectMetadataItem, recordBoardId } = useContext(RecordBoardContext);
  const { rowIndex, columnIndex } = useContext(RecordBoardCardContext);
  const { activateBoardCard } = useActiveRecordBoardCard(recordBoardId);
  const { unfocusBoardCard } = useFocusedRecordBoardCard(recordBoardId);

  const { currentView } = useGetCurrentViewOnly();

  const isCompactModeActive = currentView?.isCompact ?? false;

  const [recordBoardCardIsExpanded, setRecordBoardCardIsExpanded] =
    useAtomComponentState(recordBoardCardIsExpandedComponentState);

  const isRecordSelected = useAtomComponentFamilyStateValue(
    isRecordSelectedComponentFamilyState,
    recordId,
  );

  const { toggleRecordSelection } = useToggleRecordSelection(recordBoardId);

  const { openRecordFromIndexView } = useOpenRecordFromIndexView();

  const openRecordIn = useResolveOpenRecordIn(objectMetadataItem.nameSingular);

  const isTouchDevice = useIsTouchDevice();
  const isMobile = useIsMobile();

  const recordStore = useAtomFamilyStateValue(recordStoreFamilyState, recordId);

  const triggerEvent =
    openRecordIn === OpenRecordIn.SIDE_PANEL || isTouchDevice
      ? 'CLICK'
      : 'MOUSE_DOWN';

  return (
    <RecordCardHeaderContainer isCompact={isCompactModeActive}>
      <div {...stylex.props(styles.recordChipContainer)}>
        <StopPropagationContainer>
          {isDefined(recordStore) && (
            <RecordChip
              objectNameSingular={objectMetadataItem.nameSingular}
              record={recordStore}
              variant="ghost"
              onClick={() => {
                activateBoardCard({ rowIndex, columnIndex });
                unfocusBoardCard();
                openRecordFromIndexView({ recordId });
              }}
              triggerEvent={triggerEvent}
            />
          )}
        </StopPropagationContainer>
      </div>

      {isCompactModeActive && (
        <div {...stylex.props(styles.compactIconContainer)}>
          <StopPropagationContainer>
            <LightIconButton
              emphasis="subtle"
              onClick={() => {
                setRecordBoardCardIsExpanded(!recordBoardCardIsExpanded);
              }}
              aria-label={
                recordBoardCardIsExpanded ? t`Collapse card` : t`Expand card`
              }
              aria-expanded={recordBoardCardIsExpanded}
            >
              {recordBoardCardIsExpanded ? <IconEyeOff /> : <IconEye />}
            </LightIconButton>
          </StopPropagationContainer>
        </div>
      )}
      {!isMobile && (
        <RecordCardCheckboxContainer>
          <StopPropagationContainer>
            <Checkbox
              hoverable
              checked={isRecordSelected}
              onClick={(event) => {
                toggleRecordSelection({
                  recordId,
                  shouldSelectRange: event.shiftKey,
                });
              }}
              variant="outline"
            />
          </StopPropagationContainer>
        </RecordCardCheckboxContainer>
      )}
    </RecordCardHeaderContainer>
  );
};
