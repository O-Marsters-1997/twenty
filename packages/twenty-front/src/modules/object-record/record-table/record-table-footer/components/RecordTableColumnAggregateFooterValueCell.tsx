import { hasRecordGroupsComponentSelector } from '@/object-record/record-group/states/selectors/hasRecordGroupsComponentSelector';
import { recordTableLayout } from '../../constants/recordTableLayout.stylex';

import { RecordTableColumnAggregateFooterCellContext } from '@/object-record/record-table/record-table-footer/components/RecordTableColumnAggregateFooterCellContext';
import { RecordTableColumnAggregateFooterValue } from '@/object-record/record-table/record-table-footer/components/RecordTableColumnAggregateFooterValue';
import { hasAggregateOperationForViewFieldFamilySelector } from '@/object-record/record-table/record-table-footer/states/hasAggregateOperationForViewFieldFamilySelector';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useContext, useState } from 'react';
import { IconChevronDown } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  cell: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 0,
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-8'],
    justifyContent: 'space-between',
    maxWidth: '100%',
    minWidth: spacing['--t-spacing-7'],
    paddingLeft: 0,
  },
  cellUnfolded: {
    backgroundColor: background['--t-background-tertiary'],
  },
  cellFirst: {
    paddingLeft: `calc(${recordTableLayout.checkboxColumnWidth}px + ${spacing['--t-spacing-1']})`,
  },
  iconContainer: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: '0',
    flexShrink: '0',
    height: '20px',
    justifyContent: 'center',
    paddingRight: spacing['--t-spacing-2'],
  },
});

export const RecordTableColumnAggregateFooterValueCell = ({
  dropdownId,
  isFirstCell,
}: {
  dropdownId: string;
  isFirstCell: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    dropdownId,
  );

  const theme = useTheme();
  const { viewFieldId, fieldMetadataId } = useContext(
    RecordTableColumnAggregateFooterCellContext,
  );

  const hasAggregateOperationForViewField = useAtomFamilySelectorValue(
    hasAggregateOperationForViewFieldFamilySelector,
    { viewFieldId },
  );

  const hasRecordGroups = useAtomComponentSelectorValue(
    hasRecordGroupsComponentSelector,
  );

  return (
    <div
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        {...stylex.props(
          styles.cell,
          isDropdownOpen && styles.cellUnfolded,
          isFirstCell && styles.cellFirst,
        )}
      >
        {isHovered ||
        isDropdownOpen ||
        hasAggregateOperationForViewField ||
        (isFirstCell && !hasRecordGroups) ? (
          <>
            <RecordTableColumnAggregateFooterValue
              fieldMetadataId={fieldMetadataId}
              dropdownId={dropdownId}
            />
            {!hasAggregateOperationForViewField && (
              <div {...stylex.props(styles.iconContainer)}>
                <IconChevronDown fontWeight="light" size={theme.icon.size.sm} />
              </div>
            )}
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};
