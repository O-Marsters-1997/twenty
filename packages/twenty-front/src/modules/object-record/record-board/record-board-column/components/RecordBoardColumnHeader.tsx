import { t } from '@lingui/core/macro';
import { useContext } from 'react';

import { getFieldMetadataItemGqlFieldName } from '@/object-metadata/utils/getFieldMetadataItemGqlFieldName';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { recordBoardColumnHeaderMarker } from './RecordBoardColumnHeader.stylex';
import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { RecordBoardColumnDropdownMenu } from '@/object-record/record-board/record-board-column/components/RecordBoardColumnDropdownMenu';
import { RecordBoardColumnResizeHandler } from '@/object-record/record-board/record-board-column/components/RecordBoardColumnResizeHandler';
import { RecordBoardColumnContext } from '@/object-record/record-board/record-board-column/contexts/RecordBoardColumnContext';
import { isRecordBoardCellsNonEditableComponentState } from '@/object-record/record-board/states/isRecordBoardCellsNonEditableComponentState';
import { isRecordBoardViewSettingsReadOnlyComponentState } from '@/object-record/record-board/states/isRecordBoardViewSettingsReadOnlyComponentState';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { RecordGroupAggregateDropdown } from '@/object-record/record-group/components/RecordGroupAggregateDropdown';
import { RecordGroupChip } from '@/object-record/record-group/components/RecordGroupChip';
import { recordIndexAggregateDisplayLabelComponentState } from '@/object-record/record-index/states/recordIndexAggregateDisplayLabelComponentState';
import { recordIndexAggregateDisplayValueForGroupValueComponentFamilyState } from '@/object-record/record-index/states/recordIndexAggregateDisplayValueForGroupValueComponentFamilyState';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { useIsRecordTableWidgetAggregateNonInteractive } from '@/object-record/record-table-widget/hooks/useIsRecordTableWidgetAggregateNonInteractive';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { useOpenDropdown } from '@/ui/layout/dropdown/hooks/useOpenDropdown';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { DragDropItemSortableHandle } from '@/ui/utilities/drag-and-drop/components/DragDropItemSortableHandle';
import { useDisableDragSelectOnPointerDown } from '@/ui/utilities/drag-select/hooks/useDisableDragSelectOnPointerDown';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import { IconDotsVertical, IconPlus } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  background,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const isHeaderHovered = stylex.when.ancestor(
  ':hover',
  recordBoardColumnHeaderMarker,
);
const isHeaderFocused = stylex.when.ancestor(
  ':focus-within',
  recordBoardColumnHeaderMarker,
);

const styles = stylex.create({
  header: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'left',
    width: '100%',
  },
  headerReadOnly: {
    cursor: 'default',
  },
  headerActions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    marginBottom: `calc(-1 * ${spacing['--t-spacing-1']})`,
    marginLeft: `calc(-1 * ${spacing['--t-spacing-1']})`,
    marginRight: `calc(-1 * ${spacing['--t-spacing-1']})`,
    marginTop: `calc(-1 * ${spacing['--t-spacing-1']})`,
    maxWidth: {
      default: '0',
      ':is([data-dropdown-open="true"])': spacing['--t-spacing-14'],
      [isHeaderHovered]: spacing['--t-spacing-14'],
      [isHeaderFocused]: spacing['--t-spacing-14'],
    },
    minWidth: '0',
    opacity: {
      default: 0,
      ':is([data-dropdown-open="true"])': 1,
      [isHeaderHovered]: 1,
      [isHeaderFocused]: 1,
    },
    overflow: 'hidden',
    padding: spacing['--t-spacing-1'],
    pointerEvents: {
      default: 'none',
      ':is([data-dropdown-open="true"])': 'auto',
      [isHeaderHovered]: 'auto',
      [isHeaderFocused]: 'auto',
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'max-width, opacity',
    transitionTimingFunction: 'ease-in-out',
  },
  column: {
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 'var(--record-board-column-width, 200px)',
    minWidth: 'var(--record-board-column-width, 200px)',
    padding: spacing['--t-spacing-2'],
    position: 'relative',
  },
  columnWithLeftBorder: {
    borderLeftColor: borderColor['--t-border-color-light'],
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
  },
  aggregateDropdownContainer: {
    display: 'flex',
    pointerEvents: 'auto',
  },
  aggregateDropdownNonInteractive: {
    pointerEvents: 'none',
  },
  headerContainer: {
    background: background['--t-background-primary'],
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
  },
  tagContainer: {
    maxWidth: '100%',
    minWidth: '0',
    overflow: 'hidden',
  },
  dropdownContainer: {
    minWidth: '0',
    overflow: 'hidden',
  },
});

export const RecordBoardColumnHeader = () => {
  const { columnDefinition, columnIndex } = useContext(
    RecordBoardColumnContext,
  );

  const {
    onPointerCancel: handlePointerCancel,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
  } = useDisableDragSelectOnPointerDown();

  const { objectMetadataItem, selectFieldMetadataItem } =
    useContext(RecordBoardContext);

  const isRecordBoardViewSettingsReadOnly = useAtomComponentStateValue(
    isRecordBoardViewSettingsReadOnlyComponentState,
  );

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const recordTableWidgetContext = useContext(RecordTableWidgetContext);

  // Creating through a nested relation or junction needs a record picker only the table layout offers.
  const isCreateThroughRelationWidget =
    isDefined(recordTableWidgetContext?.nestedRelationCreateThrough) ||
    isDefined(recordTableWidgetContext?.junctionCreateThrough);

  const isRecordBoardCellsNonEditable = useAtomComponentStateValue(
    isRecordBoardCellsNonEditableComponentState,
  );

  const canCreateRecords =
    !isCreateThroughRelationWidget &&
    !isRecordBoardCellsNonEditable &&
    canCreateRecordsForObjectMetadataItem({
      objectPermissions,
      objectMetadataItem,
    });

  const isAggregateDropdownNonInteractive =
    useIsRecordTableWidgetAggregateNonInteractive() ?? false;

  const isColumnResizable = isDefined(recordTableWidgetContext)
    ? recordTableWidgetContext.isPageLayoutInEditMode
    : !isRecordBoardViewSettingsReadOnly;

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem: objectMetadataItem,
  });

  const recordIndexAggregateDisplayValueForGroupValue =
    useAtomComponentFamilyStateValue(
      recordIndexAggregateDisplayValueForGroupValueComponentFamilyState,
      { groupValue: columnDefinition?.value ?? '' },
    );

  const recordIndexAggregateDisplayLabel = useAtomComponentStateValue(
    recordIndexAggregateDisplayLabelComponentState,
  );

  const { openDropdown } = useOpenDropdown();

  const dropdownId = `record-board-column-dropdown-${columnDefinition.id}`;

  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    dropdownId,
  );

  const handleCreateNewRecordClick = async () => {
    await createNewIndexRecord({
      position: 'first',
      [getFieldMetadataItemGqlFieldName(selectFieldMetadataItem)]:
        columnDefinition.value,
    });
  };

  return (
    <div
      {...stylex.props(
        styles.column,
        columnIndex > 0 && styles.columnWithLeftBorder,
      )}
    >
      <DragDropItemSortableHandle
        fill
        disabled={isRecordBoardViewSettingsReadOnly}
      >
        <div
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          {...stylex.props(
            recordBoardColumnHeaderMarker,
            styles.header,
            isRecordBoardViewSettingsReadOnly && styles.headerReadOnly,
          )}
        >
          <div {...stylex.props(styles.headerContainer)}>
            <div {...stylex.props(styles.leftContainer)}>
              <div {...stylex.props(styles.dropdownContainer)}>
                {isRecordBoardViewSettingsReadOnly ? (
                  <div {...stylex.props(styles.tagContainer)}>
                    <RecordGroupChip
                      recordGroupDefinition={columnDefinition}
                      fieldMetadataItem={selectFieldMetadataItem}
                    />
                  </div>
                ) : (
                  <DropdownRoot dropdownId={dropdownId} type="menu">
                    <Dropdown.Trigger
                      nativeButton={false}
                      render={<div {...stylex.props(styles.tagContainer)} />}
                    >
                      <RecordGroupChip
                        recordGroupDefinition={columnDefinition}
                        fieldMetadataItem={selectFieldMetadataItem}
                      />
                    </Dropdown.Trigger>
                    <DropdownContent
                      aria-label={t`Column options`}
                      side="bottom"
                      align="start"
                      sideOffset={10}
                    >
                      <RecordBoardColumnDropdownMenu />
                    </DropdownContent>
                  </DropdownRoot>
                )}
              </div>

              <div
                inert={isAggregateDropdownNonInteractive || undefined}
                {...stylex.props(
                  styles.aggregateDropdownContainer,
                  isAggregateDropdownNonInteractive &&
                    styles.aggregateDropdownNonInteractive,
                )}
              >
                <RecordGroupAggregateDropdown
                  aggregateValue={recordIndexAggregateDisplayValueForGroupValue}
                  dropdownId={`record-board-column-aggregate-dropdown-${columnDefinition.id}`}
                  objectMetadataItem={objectMetadataItem}
                  aggregateLabel={recordIndexAggregateDisplayLabel}
                />
              </div>
            </div>
            {!isRecordBoardViewSettingsReadOnly && (
              <div
                data-dropdown-open={isDropdownOpen ? 'true' : undefined}
                {...stylex.props(styles.headerActions)}
              >
                <LightIconButton
                  emphasis="subtle"
                  aria-label={t`More options`}
                  onClick={() => {
                    openDropdown({
                      dropdownComponentInstanceIdFromProps: dropdownId,
                    });
                  }}
                >
                  <IconDotsVertical />
                </LightIconButton>
                {canCreateRecords && !hasAnySoftDeleteFilterOnView && (
                  <LightIconButton
                    emphasis="subtle"
                    aria-label={t`Add new`}
                    onClick={handleCreateNewRecordClick}
                  >
                    <IconPlus />
                  </LightIconButton>
                )}
              </div>
            )}
          </div>
        </div>
      </DragDropItemSortableHandle>
      {isColumnResizable && <RecordBoardColumnResizeHandler />}
    </div>
  );
};
