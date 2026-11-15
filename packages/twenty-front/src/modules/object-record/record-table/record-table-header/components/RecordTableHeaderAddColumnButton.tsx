import { hasRecordGroupsComponentSelector } from '@/object-record/record-group/states/selectors/hasRecordGroupsComponentSelector';
import { HIDDEN_TABLE_COLUMN_DROPDOWN_ID } from '@/object-record/record-table/constants/HiddenTableColumnDropdownId';
import { RECORD_TABLE_COLUMN_ADD_COLUMN_BUTTON_WIDTH_CLASS_NAME } from '@/object-record/record-table/constants/RecordTableColumnAddColumnButtonWidthClassName';
import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableHeaderPlusButtonContent } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderPlusButtonContent';
import { RecordTableHeaderResizeHandler } from '@/object-record/record-table/record-table-header/components/RecordTableHeaderResizeHandler';
import { isRecordTableRowActiveComponentFamilyState } from '@/object-record/record-table/states/isRecordTableRowActiveComponentFamilyState';
import { isRecordTableRowFocusActiveComponentState } from '@/object-record/record-table/states/isRecordTableRowFocusActiveComponentState';
import { isRecordTableRowFocusedComponentFamilyState } from '@/object-record/record-table/states/isRecordTableRowFocusedComponentFamilyState';
import { isRecordTableScrolledVerticallyComponentState } from '@/object-record/record-table/states/isRecordTableScrolledVerticallyComponentState';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import { t } from '@lingui/core/macro';
import { Dropdown } from 'twenty-ui/components/navigation';
import { IconPlus } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { media } from 'twenty-ui/theme/constants.stylex';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  plusIconHeaderCell: {
    backgroundColor: {
      default: background['--t-background-primary'],
      ':hover': {
        default: null,
        [media.hoverCapable]: background['--t-background-secondary'],
      },
    },
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    height: recordTableLayout.rowHeight,
    maxHeight: recordTableLayout.rowHeight,
    width: recordTableLayout.addColumnButtonWidth,
    zIndex: 1,
  },
  borderBottom: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  },
  plusIconContainer: {
    alignItems: 'center',
    display: 'flex',
    height: recordTableLayout.rowHeight,
    justifyContent: 'center',
    width: '100%',
  },
  dropdownContainer: {
    cursor: 'pointer',
    width: '100%',
  },
});

export const RecordTableHeaderAddColumnButton = () => {
  const theme = useTheme();

  const isRecordTableRowActive = useAtomComponentFamilyStateValue(
    isRecordTableRowActiveComponentFamilyState,
    0,
  );

  const isRecordTableRowFocused = useAtomComponentFamilyStateValue(
    isRecordTableRowFocusedComponentFamilyState,
    0,
  );

  const isRecordTableRowFocusActive = useAtomComponentStateValue(
    isRecordTableRowFocusActiveComponentState,
  );

  const isFirstRowActiveOrFocused =
    isRecordTableRowActive ||
    (isRecordTableRowFocused && isRecordTableRowFocusActive);

  const isRecordTableScrolledVertically = useAtomComponentStateValue(
    isRecordTableScrolledVerticallyComponentState,
  );

  const hasRecordGroups = useAtomComponentSelectorValue(
    hasRecordGroupsComponentSelector,
  );

  const shouldDisplayBorderBottom =
    hasRecordGroups ||
    !isFirstRowActiveOrFocused ||
    isRecordTableScrolledVertically;

  const { visibleRecordFields, recordTableId } = useRecordTableContextOrThrow();

  const cellProps = stylex.props(
    styles.plusIconHeaderCell,
    shouldDisplayBorderBottom && styles.borderBottom,
  );

  return (
    <div
      {...mergeClassName(
        cellProps,
        `header-cell ${RECORD_TABLE_COLUMN_ADD_COLUMN_BUTTON_WIDTH_CLASS_NAME}`,
      )}
    >
      <RecordTableHeaderResizeHandler
        recordFieldIndex={visibleRecordFields.length}
        position="left"
      />
      <div {...stylex.props(styles.dropdownContainer)}>
        <DropdownRoot
          dropdownId={`${HIDDEN_TABLE_COLUMN_DROPDOWN_ID}-${recordTableId}`}
          type="picker"
        >
          <Dropdown.Trigger
            render={<div {...stylex.props(styles.plusIconContainer)} />}
            nativeButton={false}
            aria-label={t`Add column`}
          >
            <IconPlus size={theme.icon.size.md} />
          </Dropdown.Trigger>
          <DropdownContent
            align="start"
            width={GenericDropdownContentWidth.Medium}
          >
            <RecordTableHeaderPlusButtonContent />
          </DropdownContent>
        </DropdownRoot>
      </div>
    </div>
  );
};
