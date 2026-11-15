import { AdvancedFilterLogicalOperatorDropdown } from '@/object-record/advanced-filter/components/AdvancedFilterLogicalOperatorDropdown';
import { ADVANCED_FILTER_LOGICAL_OPERATOR_OPTIONS } from '@/object-record/advanced-filter/constants/AdvancedFilterLogicalOperatorOptions';
import { DEFAULT_ADVANCED_FILTER_DROPDOWN_SIDE_OFFSET } from '@/object-record/advanced-filter/constants/DefaultAdvancedFilterDropdownSideOffset';
import { AdvancedFilterContext } from '@/object-record/advanced-filter/states/context/AdvancedFilterContext';
import { type RecordFilterGroup } from '@/object-record/record-filter-group/types/RecordFilterGroup';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';

import { t } from '@lingui/core/macro';
import { useContext } from 'react';
import { capitalize } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  text: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    height: spacing['--t-spacing-8'],
  },
  container: {
    alignItems: 'start',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    minWidth: spacing['--t-spacing-20'],
  },
});

type AdvancedFilterSidePanelLogicalOperatorCellProps = {
  index: number;
  recordFilterGroup: RecordFilterGroup;
};

export const AdvancedFilterSidePanelLogicalOperatorCell = ({
  index,
  recordFilterGroup,
}: AdvancedFilterSidePanelLogicalOperatorCellProps) => {
  const { readonly } = useContext(AdvancedFilterContext);

  return (
    <div {...stylex.props(styles.container)}>
      {index === 0 ? (
        <div {...stylex.props(styles.text)}>{t`Where`}</div>
      ) : index === 1 ? (
        readonly ? (
          <Select
            dropdownWidth={GenericDropdownContentWidth.Narrow}
            dropdownId={`advanced-filter-logical-operator-${recordFilterGroup.id}`}
            value={recordFilterGroup.logicalOperator}
            options={ADVANCED_FILTER_LOGICAL_OPERATOR_OPTIONS}
            dropdownSideOffset={DEFAULT_ADVANCED_FILTER_DROPDOWN_SIDE_OFFSET}
            disabled
          />
        ) : (
          <AdvancedFilterLogicalOperatorDropdown
            recordFilterGroup={recordFilterGroup}
          />
        )
      ) : (
        <div {...stylex.props(styles.text)}>
          {capitalize(recordFilterGroup.logicalOperator.toLowerCase())}
        </div>
      )}
    </div>
  );
};
