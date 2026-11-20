import { type ReactNode, useMemo } from 'react';

import { useObjectNameSingularFromPlural } from '@/object-metadata/hooks/useObjectNameSingularFromPlural';
import { ObjectFilterDropdownComponentInstanceContext } from '@/object-record/object-filter-dropdown/states/contexts/ObjectFilterDropdownComponentInstanceContext';
import { useHandleToggleTrashColumnFilter } from '@/object-record/record-index/hooks/useHandleToggleTrashColumnFilter';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { AdvancedFilterDropdownButton } from '@/views/advanced-filter-chip/components/AdvancedFilterDropdownButton';
import { ViewBarDetailsAddFilterButton } from '@/views/components/ViewBarDetailsAddFilterButton';
import { EditableSortChip } from '@/views/editable-chip/components/EditableSortChip';

import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { currentRecordSortsComponentState } from '@/object-record/record-sort/states/currentRecordSortsComponentState';
import { SoftDeleteFilterChip } from '@/views/components/SoftDeleteFilterChip';
import { useApplyCurrentViewFiltersToCurrentRecordFilters } from '@/views/hooks/useApplyCurrentViewFiltersToCurrentRecordFilters';
import { useApplyCurrentViewSortsToCurrentRecordSorts } from '@/views/hooks/useApplyCurrentViewSortsToCurrentRecordSorts';
import { useAreViewFiltersDifferentFromRecordFilters } from '@/views/hooks/useAreViewFiltersDifferentFromRecordFilters';
import { useAreViewSortsDifferentFromRecordSorts } from '@/views/hooks/useAreViewSortsDifferentFromRecordSorts';

import { currentRecordFilterGroupsComponentState } from '@/object-record/record-filter-group/states/currentRecordFilterGroupsComponentState';
import { useCheckIsSoftDeleteFilter } from '@/object-record/record-filter/hooks/useCheckIsSoftDeleteFilter';
import { anyFieldFilterValueComponentState } from '@/object-record/record-filter/states/anyFieldFilterValueComponentState';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { AnyFieldSearchDropdownButton } from '@/views/components/AnyFieldSearchDropdownButton';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { getAnyFieldSearchDropdownId } from '@/views/utils/getAnyFieldSearchDropdownId';
import { EditableFilterDropdownButton } from '@/views/editable-chip/components/EditableFilterDropdownButton';
import { getEditableChipObjectFilterDropdownComponentInstanceId } from '@/views/editable-chip/utils/getEditableChipObjectFilterDropdownComponentInstanceId';
import { useHasFiltersInQueryParams } from '@/views/hooks/internal/useHasFiltersInQueryParams';
import { useApplyCurrentViewAnyFieldFilterToAnyFieldFilter } from '@/views/hooks/useApplyCurrentViewAnyFieldFilterToAnyFieldFilter';
import { useApplyCurrentViewFilterGroupsToCurrentRecordFilterGroups } from '@/views/hooks/useApplyCurrentViewFilterGroupsToCurrentRecordFilterGroups';
import { useAreViewFilterGroupsDifferentFromRecordFilterGroups } from '@/views/hooks/useAreViewFilterGroupsDifferentFromRecordFilterGroups';
import { useIsViewAnyFieldFilterDifferentFromCurrentAnyFieldFilter } from '@/views/hooks/useIsViewAnyFieldFilterDifferentFromCurrentAnyFieldFilter';
import { isViewBarExpandedComponentState } from '@/views/states/isViewBarExpandedComponentState';
import { t } from '@lingui/core/macro';
import { isNonEmptyArray, isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { LightButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export type ViewBarDetailsProps = {
  hasFilterButton?: boolean;
  rightComponent?: ReactNode;
  viewBarId: string;
  objectNamePlural: string;
};

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: '4',
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    minHeight: '32px',
    paddingBottom: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
  chipContainer: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    zIndex: '1',
  },
  actionButtonContainer: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'row',
  },
  filterContainer: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    overflowX: 'hidden',
  },
  separatorContainer: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    display: 'flex',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-2'],
  },
  separator: {
    background: background['--t-background-quaternary'],
    alignSelf: 'stretch',
    width: '1px',
  },
  addFilterContainer: {
    zIndex: '5',
  },
});

export const ViewBarDetails = ({
  hasFilterButton = false,
  rightComponent,
  viewBarId,
  objectNamePlural,
}: ViewBarDetailsProps) => {
  const { recordIndexId } = useRecordIndexContextOrThrow();

  const isViewBarExpanded = useAtomComponentStateValue(
    isViewBarExpandedComponentState,
  );

  const { hasFiltersQueryParams } = useHasFiltersInQueryParams();

  const currentRecordFilterGroups = useAtomComponentStateValue(
    currentRecordFilterGroupsComponentState,
    viewBarId,
  );

  const currentRecordFilters = useAtomComponentStateValue(
    currentRecordFiltersComponentState,
    viewBarId,
  );

  const currentRecordSorts = useAtomComponentStateValue(
    currentRecordSortsComponentState,
    viewBarId,
  );

  const anyFieldFilterValue = useAtomComponentStateValue(
    anyFieldFilterValueComponentState,
    viewBarId,
  );

  const { objectNameSingular } = useObjectNameSingularFromPlural({
    objectNamePlural: objectNamePlural,
  });
  const { toggleSoftDeleteFilterState } = useHandleToggleTrashColumnFilter({
    objectNameSingular: objectNameSingular,
    viewBarId: viewBarId,
  });

  const { viewFilterGroupsAreDifferentFromRecordFilterGroups } =
    useAreViewFilterGroupsDifferentFromRecordFilterGroups();

  const { viewFiltersAreDifferentFromRecordFilters } =
    useAreViewFiltersDifferentFromRecordFilters();

  const { viewSortsAreDifferentFromRecordSorts } =
    useAreViewSortsDifferentFromRecordSorts();

  const { viewAnyFieldFilterDifferentFromCurrentAnyFieldFilter } =
    useIsViewAnyFieldFilterDifferentFromCurrentAnyFieldFilter();

  const { isSeeDeletedRecordsFilter } = useCheckIsSoftDeleteFilter();

  const allSoftDeletedRecordsFilter = currentRecordFilters.find(
    (recordFilter) => isSeeDeletedRecordsFilter(recordFilter),
  );

  const recordFilters = useMemo(() => {
    return currentRecordFilters.filter(
      (recordFilter) =>
        !recordFilter.recordFilterGroupId &&
        !isSeeDeletedRecordsFilter(recordFilter),
    );
  }, [currentRecordFilters, isSeeDeletedRecordsFilter]);

  const { applyCurrentViewFilterGroupsToCurrentRecordFilterGroups } =
    useApplyCurrentViewFilterGroupsToCurrentRecordFilterGroups();

  const { applyCurrentViewFiltersToCurrentRecordFilters } =
    useApplyCurrentViewFiltersToCurrentRecordFilters();

  const { applyCurrentViewAnyFieldFilterToAnyFieldFilter } =
    useApplyCurrentViewAnyFieldFilterToAnyFieldFilter();

  const { applyCurrentViewSortsToCurrentRecordSorts } =
    useApplyCurrentViewSortsToCurrentRecordSorts();

  const handleCancelClick = () => {
    applyCurrentViewFilterGroupsToCurrentRecordFilterGroups();
    applyCurrentViewFiltersToCurrentRecordFilters();
    applyCurrentViewSortsToCurrentRecordSorts();
    applyCurrentViewAnyFieldFilterToAnyFieldFilter();
    toggleSoftDeleteFilterState(false);
  };

  const shouldShowAdvancedFilterDropdownButton =
    currentRecordFilterGroups.length > 0;

  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    getAnyFieldSearchDropdownId(recordIndexId),
  );

  const canResetView =
    (viewFiltersAreDifferentFromRecordFilters ||
      viewSortsAreDifferentFromRecordSorts ||
      viewFilterGroupsAreDifferentFromRecordFilterGroups ||
      viewAnyFieldFilterDifferentFromCurrentAnyFieldFilter) &&
    !hasFiltersQueryParams;

  const shouldShowAnyFieldSearchChip =
    isNonEmptyString(anyFieldFilterValue) || isDropdownOpen;

  const shouldExpandViewBar =
    shouldShowAnyFieldSearchChip ||
    viewFiltersAreDifferentFromRecordFilters ||
    viewSortsAreDifferentFromRecordSorts ||
    viewFilterGroupsAreDifferentFromRecordFilterGroups ||
    viewAnyFieldFilterDifferentFromCurrentAnyFieldFilter ||
    ((currentRecordSorts.length > 0 ||
      currentRecordFilters.length > 0 ||
      currentRecordFilterGroups.length > 0) &&
      isViewBarExpanded);

  if (!shouldExpandViewBar) {
    return null;
  }

  return (
    <div {...stylex.props(styles.bar)}>
      <div {...stylex.props(styles.filterContainer)}>
        <ScrollWrapper
          componentInstanceId={viewBarId}
          defaultEnableYScroll={false}
        >
          <div {...stylex.props(styles.chipContainer)}>
            {isDefined(allSoftDeletedRecordsFilter) && (
              <SoftDeleteFilterChip
                key={allSoftDeletedRecordsFilter.fieldMetadataId}
                recordFilter={allSoftDeletedRecordsFilter}
                viewBarId={viewBarId}
              />
            )}
            {isDefined(allSoftDeletedRecordsFilter) && (
              <div {...stylex.props(styles.separatorContainer)}>
                <div {...stylex.props(styles.separator)} />
              </div>
            )}
            {currentRecordSorts.map((recordSort) => (
              <EditableSortChip
                key={recordSort.fieldMetadataId}
                recordSort={recordSort}
              />
            ))}
            {isNonEmptyArray(recordFilters) &&
              isNonEmptyArray(currentRecordSorts) && (
                <div {...stylex.props(styles.separatorContainer)}>
                  <div {...stylex.props(styles.separator)} />
                </div>
              )}
            {shouldShowAnyFieldSearchChip && <AnyFieldSearchDropdownButton />}
            {shouldShowAdvancedFilterDropdownButton && (
              <AdvancedFilterDropdownButton />
            )}
            {recordFilters.map((recordFilter) => (
              <ObjectFilterDropdownComponentInstanceContext.Provider
                key={recordFilter.id}
                value={{
                  instanceId:
                    getEditableChipObjectFilterDropdownComponentInstanceId({
                      recordFilterId: recordFilter.id,
                    }),
                }}
              >
                <EditableFilterDropdownButton recordFilter={recordFilter} />
              </ObjectFilterDropdownComponentInstanceContext.Provider>
            ))}
          </div>
        </ScrollWrapper>
        {hasFilterButton && (
          <div {...stylex.props(styles.addFilterContainer)}>
            <ViewBarDetailsAddFilterButton />
          </div>
        )}
      </div>
      <div {...stylex.props(styles.actionButtonContainer)}>
        {canResetView && (
          <LightButton
            emphasis="subtle"
            data-testid="cancel-button"
            onClick={handleCancelClick}
          >{t`Reset`}</LightButton>
        )}
        {rightComponent}
      </div>
    </div>
  );
};
