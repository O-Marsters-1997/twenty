import { AdvancedFilterSidePanelColumn } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelColumn';
import { WorkflowStepFilterFieldSelect } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterFieldSelect';
import { WorkflowStepFilterLogicalOperatorCell } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterLogicalOperatorCell';
import { WorkflowStepFilterOperandSelect } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterOperandSelect';
import { WorkflowStepFilterOptionsDropdown } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterOptionsDropdown';
import { WorkflowStepFilterValueInput } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterValueInput';
import { WorkflowStepFilterContext } from '@/workflow/workflow-steps/filters/states/context/WorkflowStepFilterContext';
import { useContext } from 'react';
import { type StepFilter, type StepFilterGroup } from 'twenty-shared/types';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type WorkflowStepFilterColumnProps = {
  stepFilterGroup: StepFilterGroup;
  stepFilter: StepFilter;
  stepFilterIndex: number;
  firstFilterLabel?: string;
  elseIfIndex?: number;
  preventDeletion?: boolean;
};

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'space-between',
  },
});

export const WorkflowStepFilterColumn = ({
  stepFilterGroup,
  stepFilter,
  stepFilterIndex,
  firstFilterLabel,
  elseIfIndex,
  preventDeletion = false,
}: WorkflowStepFilterColumnProps) => {
  const { readonly } = useContext(WorkflowStepFilterContext);

  const shouldShowDropdown = !readonly && !preventDeletion;

  return (
    <AdvancedFilterSidePanelColumn>
      <div {...stylex.props(styles.container)}>
        <WorkflowStepFilterLogicalOperatorCell
          index={stepFilterIndex}
          stepFilterGroup={stepFilterGroup}
          firstFilterLabel={firstFilterLabel}
          elseIfIndex={elseIfIndex}
        />
        {shouldShowDropdown && (
          <WorkflowStepFilterOptionsDropdown stepFilterId={stepFilter.id} />
        )}
      </div>
      <WorkflowStepFilterFieldSelect stepFilter={stepFilter} />
      <WorkflowStepFilterOperandSelect stepFilter={stepFilter} />
      <WorkflowStepFilterValueInput stepFilter={stepFilter} />
    </AdvancedFilterSidePanelColumn>
  );
};
