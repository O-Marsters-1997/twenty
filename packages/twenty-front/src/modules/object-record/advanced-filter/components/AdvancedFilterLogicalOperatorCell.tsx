import { AdvancedFilterLogicalOperatorDropdown } from '@/object-record/advanced-filter/components/AdvancedFilterLogicalOperatorDropdown';
import { type RecordFilterGroup } from '@/object-record/record-filter-group/types/RecordFilterGroup';

import { t } from '@lingui/core/macro';
import { capitalize } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  text: {
    alignItems: 'center',
    display: 'flex',
    height: spacing['--t-spacing-8'],
    paddingLeft: '9px',
  },
  container: {
    alignItems: 'start',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    minWidth: spacing['--t-spacing-20'],
  },
});

type AdvancedFilterLogicalOperatorCellProps = {
  index: number;
  recordFilterGroup: RecordFilterGroup;
};

export const AdvancedFilterLogicalOperatorCell = ({
  index,
  recordFilterGroup,
}: AdvancedFilterLogicalOperatorCellProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      {index === 0 ? (
        <div {...stylex.props(styles.text)}>{t`Where`}</div>
      ) : index === 1 ? (
        <AdvancedFilterLogicalOperatorDropdown
          recordFilterGroup={recordFilterGroup}
        />
      ) : (
        <div {...stylex.props(styles.text)}>
          {capitalize(recordFilterGroup.logicalOperator.toLowerCase())}
        </div>
      )}
    </div>
  );
};
