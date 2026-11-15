import { AdvancedFilterSidePanelColumn } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelColumn';
import { AdvancedFilterSidePanelLogicalOperatorCell } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelLogicalOperatorCell';
import { AdvancedFilterSidePanelRecordFilterGroupChildren } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelRecordFilterGroupChildren';
import { AdvancedFilterRecordFilterGroupOptionsDropdown } from '@/object-record/advanced-filter/components/AdvancedFilterRecordFilterGroupOptionsDropdown';
import { AdvancedFilterContext } from '@/object-record/advanced-filter/states/context/AdvancedFilterContext';
import { type RecordFilterGroup } from '@/object-record/record-filter-group/types/RecordFilterGroup';

import { useContext } from 'react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'space-between',
  },
});

export const AdvancedFilterSidePanelRecordFilterGroupColumn = ({
  parentRecordFilterGroup,
  recordFilterGroup,
  recordFilterGroupIndex,
}: {
  parentRecordFilterGroup: RecordFilterGroup;
  recordFilterGroup: RecordFilterGroup;
  recordFilterGroupIndex: number;
}) => {
  const { readonly } = useContext(AdvancedFilterContext);

  return (
    <AdvancedFilterSidePanelColumn>
      <div {...stylex.props(styles.container)}>
        <AdvancedFilterSidePanelLogicalOperatorCell
          index={recordFilterGroupIndex}
          recordFilterGroup={parentRecordFilterGroup}
        />
        {!readonly && (
          <AdvancedFilterRecordFilterGroupOptionsDropdown
            recordFilterGroupId={recordFilterGroup.id}
          />
        )}
      </div>
      <AdvancedFilterSidePanelRecordFilterGroupChildren
        recordFilterGroupId={recordFilterGroup.id}
      />
    </AdvancedFilterSidePanelColumn>
  );
};
