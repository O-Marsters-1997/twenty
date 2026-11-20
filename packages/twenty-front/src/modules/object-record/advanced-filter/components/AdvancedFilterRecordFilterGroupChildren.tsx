import { AdvancedFilterAddFilterRuleSelect } from '@/object-record/advanced-filter/components/AdvancedFilterAddFilterRuleSelect';
import { AdvancedFilterRecordFilterRow } from '@/object-record/advanced-filter/components/AdvancedFilterRecordFilterRow';

import { useChildRecordFiltersAndRecordFilterGroups } from '@/object-record/advanced-filter/hooks/useChildRecordFiltersAndRecordFilterGroups';
import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    padding: spacing['--t-spacing-2'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    flex: '1',
    gap: spacing['--t-spacing-2'],
    alignItems: 'start',
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
  },
  grayBackground: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
  },
});

type AdvancedFilterRecordFilterGroupChildrenProps = {
  recordFilterGroupId: string;
};

export const AdvancedFilterRecordFilterGroupChildren = ({
  recordFilterGroupId,
}: AdvancedFilterRecordFilterGroupChildrenProps) => {
  const { currentRecordFilterGroup, childRecordFilters } =
    useChildRecordFiltersAndRecordFilterGroups({
      recordFilterGroupId,
    });

  if (!currentRecordFilterGroup) {
    return null;
  }

  const hasParentRecordFilterGroup = isDefined(
    currentRecordFilterGroup.parentRecordFilterGroupId,
  );

  return (
    <div
      {...stylex.props(
        styles.container,
        hasParentRecordFilterGroup && styles.grayBackground,
      )}
    >
      {childRecordFilters.map((childRecordFilter, childRecordFilterIndex) => (
        <AdvancedFilterRecordFilterRow
          key={childRecordFilter.id}
          recordFilter={childRecordFilter}
          recordFilterIndex={childRecordFilterIndex}
          recordFilterGroup={currentRecordFilterGroup}
        />
      ))}
      <AdvancedFilterAddFilterRuleSelect
        recordFilterGroup={currentRecordFilterGroup}
      />
    </div>
  );
};
