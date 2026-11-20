import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { AdvancedFilterSidePanelCreateRootFilterButton } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelCreateRootFilterButton';
import { AdvancedFilterSidePanelRecordFilterColumn } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelRecordFilterColumn';
import { AdvancedFilterSidePanelRecordFilterGroupColumn } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelRecordFilterGroupColumn';
import { AdvancedFilterAddFilterRuleSelect } from '@/object-record/advanced-filter/components/AdvancedFilterAddFilterRuleSelect';
import { useChildRecordFiltersAndRecordFilterGroups } from '@/object-record/advanced-filter/hooks/useChildRecordFiltersAndRecordFilterGroups';
import { AdvancedFilterContext } from '@/object-record/advanced-filter/states/context/AdvancedFilterContext';
import { rootLevelRecordFilterGroupComponentSelector } from '@/object-record/advanced-filter/states/rootLevelRecordFilterGroupComponentSelector';
import { isRecordFilterGroupChildARecordFilterGroup } from '@/object-record/advanced-filter/utils/isRecordFilterGroupChildARecordFilterGroup';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'start',
    display: 'flex',
    flexDirection: 'column',
  },
  childContainer: {
    gap: spacing['--t-spacing-6'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

export type AdvancedFilterSidePanelContainerProps = {
  readonly?: boolean;
  onUpdate?: () => void;
  objectMetadataItem: EnrichedObjectMetadataItem;
  VariablePicker?: VariablePickerComponent;
  isWorkflowFindRecords?: boolean;
};

export const AdvancedFilterSidePanelContainer = ({
  readonly,
  onUpdate,
  objectMetadataItem,
  VariablePicker,
  isWorkflowFindRecords,
}: AdvancedFilterSidePanelContainerProps) => {
  const rootRecordFilterGroup = useAtomComponentSelectorValue(
    rootLevelRecordFilterGroupComponentSelector,
  );

  const { childRecordFiltersAndRecordFilterGroups } =
    useChildRecordFiltersAndRecordFilterGroups({
      recordFilterGroupId: rootRecordFilterGroup?.id,
    });

  return (
    <AdvancedFilterContext.Provider
      value={{
        onUpdate: readonly ? undefined : onUpdate,
        isWorkflowFindRecords,
        readonly,
        VariablePicker,
        objectMetadataItem,
      }}
    >
      {isDefined(rootRecordFilterGroup) ? (
        <div {...stylex.props(styles.container)}>
          <div {...stylex.props(styles.childContainer)}>
            {childRecordFiltersAndRecordFilterGroups.map(
              (recordFilterGroupChild, recordFilterGroupChildIndex) =>
                isRecordFilterGroupChildARecordFilterGroup(
                  recordFilterGroupChild,
                ) ? (
                  <AdvancedFilterSidePanelRecordFilterGroupColumn
                    key={recordFilterGroupChild.id}
                    parentRecordFilterGroup={rootRecordFilterGroup}
                    recordFilterGroup={recordFilterGroupChild}
                    recordFilterGroupIndex={recordFilterGroupChildIndex}
                  />
                ) : (
                  <AdvancedFilterSidePanelRecordFilterColumn
                    key={recordFilterGroupChild.id}
                    recordFilterGroup={rootRecordFilterGroup}
                    recordFilter={recordFilterGroupChild}
                    recordFilterIndex={recordFilterGroupChildIndex}
                  />
                ),
            )}
          </div>
          {!readonly && (
            <AdvancedFilterAddFilterRuleSelect
              recordFilterGroup={rootRecordFilterGroup}
            />
          )}
        </div>
      ) : (
        <AdvancedFilterSidePanelCreateRootFilterButton
          objectMetadataItem={objectMetadataItem}
        />
      )}
    </AdvancedFilterContext.Provider>
  );
};
