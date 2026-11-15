import { cx } from '@linaria/core';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

import { visibleRecordFieldsComponentSelector } from '@/object-record/record-field/states/visibleRecordFieldsComponentSelector';
import { RecordGroupAggregateDropdown } from '@/object-record/record-group/components/RecordGroupAggregateDropdown';
import { RecordGroupSectionHeader } from '@/object-record/record-group/components/RecordGroupSectionHeader';
import { useCurrentRecordGroupId } from '@/object-record/record-group/hooks/useCurrentRecordGroupId';
import { useShouldHideRecordGroup } from '@/object-record/record-group/hooks/useShouldHideRecordGroup';
import { recordGroupDefinitionFamilyState } from '@/object-record/record-group/states/recordGroupDefinitionFamilyState';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { recordIndexGroupFieldMetadataItemComponentState } from '@/object-record/record-index/states/recordIndexGroupFieldMetadataComponentState';
import {
  recordTableLayout,
  recordTableZIndex,
} from '../../constants/recordTableLayout.stylex';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableAddButtonPlaceholderCell } from '@/object-record/record-table/record-table-row/components/RecordTableAddButtonPlaceholderCell';
import { RecordTableGroupSectionLastDynamicFillingCell } from '@/object-record/record-table/record-table-row/components/RecordTableGroupSectionLastDynamicFillingCell';

import { RECORD_TABLE_COLUMN_CHECKBOX_WIDTH } from '@/object-record/record-table/constants/RecordTableColumnCheckboxWidth';
import { RECORD_TABLE_COLUMN_MIN_WIDTH } from '@/object-record/record-table/constants/RecordTableColumnMinWidth';
import { useRecordTableFirstColumnWidthOverride } from '@/object-record/record-table/hooks/useRecordTableFirstColumnWidthOverride';

import { recordIndexAggregateDisplayLabelComponentState } from '@/object-record/record-index/states/recordIndexAggregateDisplayLabelComponentState';
import { recordIndexAggregateDisplayValueForGroupValueComponentFamilyState } from '@/object-record/record-index/states/recordIndexAggregateDisplayValueForGroupValueComponentFamilyState';
import { useIsRecordTableWidgetAggregateNonInteractive } from '@/object-record/record-table-widget/hooks/useIsRecordTableWidgetAggregateNonInteractive';
import { isRecordGroupTableSectionToggledComponentState } from '@/object-record/record-table/record-table-section/states/isRecordGroupTableSectionToggledComponentState';
import { useAtomComponentFamilyState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import {
  filterOutByProperty,
  findByProperty,
  isDefined,
  sumByProperty,
} from 'twenty-shared/utils';

const StyledTrContainer = styled.div`
  display: flex;
  flex-direction: row;

  > div:not(:first-of-type) {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
  }
`;

const styles = stylex.create({
  recordGroupHeaderContainer: {
    alignItems: 'center',
    borderRightStyle: 'none',
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
    height: recordTableLayout.rowHeight,
    left: recordTableLayout.dragAndDropColumnWidth,
    position: 'sticky',
    zIndex: recordTableZIndex.groupSectionStickyCell,
  },
  recordGroupHeaderWidth: (width: number) => ({
    minWidth: width,
    width,
  }),
  aggregateDropdownContainer: {
    display: 'flex',
    pointerEvents: 'auto',
  },
  aggregateDropdownContainerNonInteractive: {
    pointerEvents: 'none',
  },
  fieldPlaceholderCell: (widthOfFields: number) => ({
    height: recordTableLayout.rowHeight,
    minWidth: widthOfFields,
    width: widthOfFields,
    zIndex: recordTableZIndex.groupSectionNormalCell,
  }),
  dragAndDropPlaceholderCell: {
    backgroundColor: background['--t-background-primary'],
    borderBottomColor: background['--t-background-primary'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: recordTableLayout.rowHeight,
    left: 0,
    minWidth: recordTableLayout.dragAndDropColumnWidth,
    position: 'sticky',
    width: recordTableLayout.dragAndDropColumnWidth,
    zIndex: recordTableZIndex.groupSectionStickyCell,
  },
});

export const RecordTableRecordGroupSection = () => {
  const currentRecordGroupId = useCurrentRecordGroupId();

  const shouldHide = useShouldHideRecordGroup(currentRecordGroupId);

  const { objectMetadataItem } = useRecordTableContextOrThrow();

  const recordGroupDefinition = useAtomFamilyStateValue(
    recordGroupDefinitionFamilyState,
    currentRecordGroupId,
  );

  const recordIndexGroupFieldMetadataItem = useAtomComponentStateValue(
    recordIndexGroupFieldMetadataItemComponentState,
  );

  const recordIndexAggregateDisplayValueForGroupValue =
    useAtomComponentFamilyStateValue(
      recordIndexAggregateDisplayValueForGroupValueComponentFamilyState,
      { groupValue: recordGroupDefinition?.value ?? '' },
    );

  const recordIndexAggregateDisplayLabel = useAtomComponentStateValue(
    recordIndexAggregateDisplayLabelComponentState,
  );

  const { labelIdentifierFieldMetadataItem } = useRecordIndexContextOrThrow();

  const visibleRecordFields = useAtomComponentSelectorValue(
    visibleRecordFieldsComponentSelector,
  );

  const firstColumnWidthOverride = useRecordTableFirstColumnWidthOverride();

  const widthOfLabelIdentifierRecordField =
    firstColumnWidthOverride ??
    visibleRecordFields.find(
      findByProperty(
        'fieldMetadataItemId',
        labelIdentifierFieldMetadataItem?.id ?? '',
      ),
    )?.size ??
    RECORD_TABLE_COLUMN_MIN_WIDTH;

  const [
    isRecordGroupTableSectionToggled,
    setIsRecordGroupTableSectionToggled,
  ] = useAtomComponentFamilyState(
    isRecordGroupTableSectionToggledComponentState,
    currentRecordGroupId,
  );

  const isAggregateDropdownNonInteractive =
    useIsRecordTableWidgetAggregateNonInteractive() ?? false;

  const visibleRecordFieldsWithoutLabelIdentifier = visibleRecordFields.filter(
    filterOutByProperty(
      'fieldMetadataItemId',
      labelIdentifierFieldMetadataItem?.id,
    ),
  );

  const sumOfWidthOfVisibleRecordFieldsAfterLabelIdentifierField =
    visibleRecordFieldsWithoutLabelIdentifier.reduce(sumByProperty('size'), 0);

  const sumOfBorderWidthForFields = visibleRecordFields.length;

  const fieldsPlaceholderWidth =
    sumOfWidthOfVisibleRecordFieldsAfterLabelIdentifierField +
    sumOfBorderWidthForFields;

  if (shouldHide) {
    return null;
  }

  if (!isDefined(recordGroupDefinition)) {
    return null;
  }

  const headerContainerProps = stylex.props(
    styles.recordGroupHeaderContainer,
    styles.recordGroupHeaderWidth(
      widthOfLabelIdentifierRecordField + RECORD_TABLE_COLUMN_CHECKBOX_WIDTH,
    ),
  );

  return (
    <StyledTrContainer>
      <div {...stylex.props(styles.dragAndDropPlaceholderCell)} />
      <div
        {...headerContainerProps}
        className={cx('disable-shadow', headerContainerProps.className)}
      >
        <RecordGroupSectionHeader
          recordGroupDefinition={recordGroupDefinition}
          fieldMetadataItem={recordIndexGroupFieldMetadataItem}
          isExpanded={isRecordGroupTableSectionToggled}
          onToggle={() =>
            setIsRecordGroupTableSectionToggled((prevState) => !prevState)
          }
          chevronWidth={RECORD_TABLE_COLUMN_CHECKBOX_WIDTH}
        />
        <div
          {...stylex.props(
            styles.aggregateDropdownContainer,
            isAggregateDropdownNonInteractive &&
              styles.aggregateDropdownContainerNonInteractive,
          )}
          inert={isAggregateDropdownNonInteractive || undefined}
        >
          <RecordGroupAggregateDropdown
            aggregateValue={recordIndexAggregateDisplayValueForGroupValue}
            dropdownId={`record-group-section-aggregate-dropdown-${currentRecordGroupId}`}
            objectMetadataItem={objectMetadataItem}
            aggregateLabel={recordIndexAggregateDisplayLabel}
          />
        </div>
      </div>
      <div
        {...stylex.props(styles.fieldPlaceholderCell(fieldsPlaceholderWidth))}
      />
      <RecordTableAddButtonPlaceholderCell />
      <RecordTableGroupSectionLastDynamicFillingCell />
    </StyledTrContainer>
  );
};
