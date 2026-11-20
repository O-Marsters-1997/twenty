import { RecordChip } from '@/object-record/components/RecordChip';
import { StopPropagationContainer } from '@/object-record/record-board/record-board-card/components/StopPropagationContainer';
import { useRecordCalendarContextOrThrow } from '@/object-record/record-calendar/contexts/RecordCalendarContext';
import { RecordCardHeaderContainer } from '@/object-record/record-card/components/RecordCardHeaderContainer';
import { isDraggingRecordComponentState } from '@/object-record/record-drag/states/isDraggingRecordComponentState';
import { useOpenRecordFromIndexView } from '@/object-record/record-index/hooks/useOpenRecordFromIndexView';
import { isRecordSelectedComponentFamilyState } from '@/object-record/record-selection/states/isRecordSelectedComponentFamilyState';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomComponentFamilyState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useGetCurrentViewOnly } from '@/views/hooks/useGetCurrentViewOnly';
import { RecordCardCheckboxContainer } from '@/object-record/record-card/components/RecordCardCheckboxContainer';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { isDefined } from 'twenty-shared/utils';
import { Checkbox } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  recordChipContainer: {
    overflow: 'hidden',
    display: 'flex',
    flexBasis: 'auto',
    flexGrow: '1',
    flexShrink: '1',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
});

type RecordCalendarCardHeaderProps = {
  recordId: string;
};

export const RecordCalendarCardHeader = ({
  recordId,
}: RecordCalendarCardHeaderProps) => {
  const { objectMetadataItem } = useRecordCalendarContextOrThrow();
  const recordStore = useAtomFamilyStateValue(recordStoreFamilyState, recordId);
  const { openRecordFromIndexView } = useOpenRecordFromIndexView();

  const { currentView } = useGetCurrentViewOnly();

  const isCompactModeActive = currentView?.isCompact ?? false;

  const isDraggingRecord = useAtomComponentStateValue(
    isDraggingRecordComponentState,
  );

  const [isRecordSelected, setIsRecordSelected] = useAtomComponentFamilyState(
    isRecordSelectedComponentFamilyState,
    recordId,
  );

  const handleChipClick = () => {
    if (isDraggingRecord) {
      return;
    }
    openRecordFromIndexView({ recordId });
  };

  if (!isDefined(recordStore)) {
    return null;
  }

  return (
    <RecordCardHeaderContainer isCompact={isCompactModeActive} hasSmallPadding>
      <div {...stylex.props(styles.recordChipContainer)}>
        {isCompactModeActive ? (
          <RecordChip
            objectNameSingular={objectMetadataItem.nameSingular}
            record={recordStore}
            variant="ghost"
            isIconHidden={true}
            forceDisableClick
            triggerEvent={'CLICK'}
          />
        ) : (
          <StopPropagationContainer>
            <RecordChip
              objectNameSingular={objectMetadataItem.nameSingular}
              record={recordStore}
              variant="ghost"
              isIconHidden={true}
              onClick={handleChipClick}
              triggerEvent={'CLICK'}
            />
          </StopPropagationContainer>
        )}
      </div>
      <RecordCardCheckboxContainer>
        <StopPropagationContainer>
          <Checkbox
            hoverable
            checked={isRecordSelected}
            onCheckedChange={setIsRecordSelected}
            variant="outline"
          />
        </StopPropagationContainer>
      </RecordCardCheckboxContainer>
    </RecordCardHeaderContainer>
  );
};
