import { useContext } from 'react';
import { type StepFilter, type StepFilterGroup } from 'twenty-shared/types';

import { CoreWorkflowFilterFieldSelect } from '@/object-core/workflows/components/CoreWorkflowFilterFieldSelect';
import { CoreWorkflowFilterValueInput } from '@/object-core/workflows/components/CoreWorkflowFilterValueInput';
import { AdvancedFilterSidePanelColumn } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelColumn';
import { WorkflowStepFilterLogicalOperatorCell } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterLogicalOperatorCell';
import { WorkflowStepFilterOperandSelect } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterOperandSelect';
import { WorkflowStepFilterOptionsDropdown } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterOptionsDropdown';
import { WorkflowStepFilterContext } from '@/workflow/workflow-steps/filters/states/context/WorkflowStepFilterContext';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type CoreWorkflowFilterColumnProps = {
  stepFilterGroup: StepFilterGroup;
  stepFilter: StepFilter;
  stepFilterIndex: number;
};

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'space-between',
  },
});

export const CoreWorkflowFilterColumn = ({
  stepFilterGroup,
  stepFilter,
  stepFilterIndex,
}: CoreWorkflowFilterColumnProps) => {
  const { readonly } = useContext(WorkflowStepFilterContext);

  return (
    <AdvancedFilterSidePanelColumn>
      <div {...stylex.props(styles.container)}>
        <WorkflowStepFilterLogicalOperatorCell
          index={stepFilterIndex}
          stepFilterGroup={stepFilterGroup}
        />
        {!readonly && (
          <WorkflowStepFilterOptionsDropdown stepFilterId={stepFilter.id} />
        )}
      </div>
      <CoreWorkflowFilterFieldSelect stepFilter={stepFilter} />
      <WorkflowStepFilterOperandSelect stepFilter={stepFilter} />
      <CoreWorkflowFilterValueInput stepFilter={stepFilter} />
    </AdvancedFilterSidePanelColumn>
  );
};
