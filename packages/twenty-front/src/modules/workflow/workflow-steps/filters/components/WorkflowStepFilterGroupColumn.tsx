import { AdvancedFilterSidePanelColumn } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelColumn';
import { WorkflowStepFilterGroupChildren } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterGroupChildren';
import { WorkflowStepFilterGroupOptionsDropdown } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterGroupOptionsDropdown';
import { WorkflowStepFilterLogicalOperatorCell } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterLogicalOperatorCell';
import { WorkflowStepFilterContext } from '@/workflow/workflow-steps/filters/states/context/WorkflowStepFilterContext';
import { useContext } from 'react';
import { type StepFilterGroup } from 'twenty-shared/types';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type WorkflowStepFilterGroupColumnProps = {
  parentStepFilterGroup: StepFilterGroup;
  stepFilterGroup: StepFilterGroup;
  stepFilterGroupIndex: number;
};

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export const WorkflowStepFilterGroupColumn = ({
  parentStepFilterGroup,
  stepFilterGroup,
  stepFilterGroupIndex,
}: WorkflowStepFilterGroupColumnProps) => {
  const { readonly } = useContext(WorkflowStepFilterContext);

  return (
    <AdvancedFilterSidePanelColumn>
      <div {...stylex.props(styles.container)}>
        <WorkflowStepFilterLogicalOperatorCell
          index={stepFilterGroupIndex}
          stepFilterGroup={parentStepFilterGroup}
        />
        {!readonly && (
          <WorkflowStepFilterGroupOptionsDropdown
            stepFilterGroupId={stepFilterGroup.id}
          />
        )}
      </div>
      <WorkflowStepFilterGroupChildren stepFilterGroupId={stepFilterGroup.id} />
    </AdvancedFilterSidePanelColumn>
  );
};
