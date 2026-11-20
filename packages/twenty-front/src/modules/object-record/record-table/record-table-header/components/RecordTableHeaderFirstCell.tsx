import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableColumnHead } from '@/object-record/record-table/record-table-header/components/RecordTableColumnHead';
import { RecordTableColumnHeadWithDropdown } from '@/object-record/record-table/record-table-header/components/RecordTableColumnHeadWithDropdown';
import { RecordTableHeaderResizeHandler } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderResizeHandler';

import { RecordTableHeaderCellContainer } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderCellContainer';

import { hasRecordGroupsComponentSelector } from '@/object-record/record-group/states/selectors/hasRecordGroupsComponentSelector';
import { recordTableZIndex } from '../../constants/recordTableLayout.stylex';
import { RecordTableHeaderLabelIdentifierCellPlusButton } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderLabelIdentifierCellPlusButton';
import { getVisibleFieldWithLowestPosition } from '@/object-record/record-table/record-table-header/utils/getVisibleFieldWithLowestPosition';
import { isRecordTableColumnHeadersReadOnlyComponentState } from '@/object-record/record-table/states/isRecordTableColumnHeadersReadOnlyComponentState';
import { isRecordTableColumnResizableComponentState } from '@/object-record/record-table/states/isRecordTableColumnResizableComponentState';
import { isRecordTableRowActiveComponentFamilyState } from '@/object-record/record-table/states/isRecordTableRowActiveComponentFamilyState';
import { isRecordTableRowFocusActiveComponentState } from '@/object-record/record-table/states/isRecordTableRowFocusActiveComponentState';
import { isRecordTableRowFocusedComponentFamilyState } from '@/object-record/record-table/states/isRecordTableRowFocusedComponentFamilyState';
import { isRecordTableScrolledVerticallyComponentState } from '@/object-record/record-table/states/isRecordTableScrolledVerticallyComponentState';
import { resizedFieldMetadataIdComponentState } from '@/object-record/record-table/states/resizedFieldMetadataIdComponentState';
import { getRecordTableColumnFieldWidthClassName } from '@/object-record/record-table/utils/getRecordTableColumnFieldWidthClassName';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

export const RecordTableHeaderFirstCell = () => {
  const { objectMetadataItem, visibleRecordFields } =
    useRecordTableContextOrThrow();

  const isRecordTableColumnHeadersReadOnly = useAtomComponentStateValue(
    isRecordTableColumnHeadersReadOnlyComponentState,
  );

  const isRecordTableColumnResizable = useAtomComponentStateValue(
    isRecordTableColumnResizableComponentState,
  );

  const [iconIsVisible, setIconIsVisible] = useState(false);

  const isRecordTableRowActive = useAtomComponentFamilyStateValue(
    isRecordTableRowActiveComponentFamilyState,
    0,
  );

  const isRecordTableRowFocused = useAtomComponentFamilyStateValue(
    isRecordTableRowFocusedComponentFamilyState,
    0,
  );

  const recordField = getVisibleFieldWithLowestPosition(visibleRecordFields);

  const isRecordTableScrolledVertically = useAtomComponentStateValue(
    isRecordTableScrolledVerticallyComponentState,
  );

  const isRecordTableRowFocusActive = useAtomComponentStateValue(
    isRecordTableRowFocusActiveComponentState,
  );

  const isFirstRowActiveOrFocused =
    isRecordTableRowActive ||
    (isRecordTableRowFocused && isRecordTableRowFocusActive);

  const hasRecordGroups = useAtomComponentSelectorValue(
    hasRecordGroupsComponentSelector,
  );

  const resizedFieldMetadataId = useAtomComponentStateValue(
    resizedFieldMetadataIdComponentState,
  );

  const isResizingAnyColumn = isDefined(resizedFieldMetadataId);

  const shouldDisplayBorderBottom =
    hasRecordGroups ||
    !isFirstRowActiveOrFocused ||
    isRecordTableScrolledVertically;

  if (!recordField) {
    return <></>;
  }

  return (
    <RecordTableHeaderCellContainer
      className={`header-cell ${getRecordTableColumnFieldWidthClassName(0)}`}
      key={recordField.fieldMetadataItemId}
      onMouseEnter={() => setIconIsVisible(true)}
      onMouseLeave={() => setIconIsVisible(false)}
      shouldDisplayBorderBottom={shouldDisplayBorderBottom}
      isResizing={isResizingAnyColumn}
      isReadOnly={isRecordTableColumnHeadersReadOnly}
    >
      {isRecordTableColumnHeadersReadOnly ? (
        <RecordTableColumnHead recordField={recordField} />
      ) : (
        <RecordTableColumnHeadWithDropdown
          recordField={recordField}
          objectMetadataId={objectMetadataItem.id}
        />
      )}
      {iconIsVisible && !isRecordTableColumnHeadersReadOnly && (
        <div {...stylex.props(styles.plusButtonWrapper)}>
          <RecordTableHeaderLabelIdentifierCellPlusButton />
        </div>
      )}

      {isRecordTableColumnResizable && (
        <RecordTableHeaderResizeHandler recordFieldIndex={0} position="right" />
      )}
    </RecordTableHeaderCellContainer>
  );
};

const styles = stylex.create({
  plusButtonWrapper: {
    position: 'absolute',
    zIndex: recordTableZIndex.headerColumnsSticky,
    right: 0,
    top: 0,
  },
});
