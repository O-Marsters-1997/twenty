import { WorkflowStepFilterAddFilterRuleSelect } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterAddFilterRuleSelect';
import { WorkflowStepFilterColumn } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterColumn';
import { useChildStepFiltersAndChildStepFilterGroups } from '@/workflow/workflow-steps/filters/hooks/useChildStepFiltersAndChildStepFilterGroups';
import { WorkflowStepFilterContext } from '@/workflow/workflow-steps/filters/states/context/WorkflowStepFilterContext';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    padding: spacing['--t-spacing-2'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-6'],
    alignItems: 'start',
    display: 'flex',
    flexBasis: '0%',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
  },
  grayBackground: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
  },
});

type WorkflowStepFilterGroupChildrenProps = {
  stepFilterGroupId: string;
};

export const WorkflowStepFilterGroupChildren = ({
  stepFilterGroupId,
}: WorkflowStepFilterGroupChildrenProps) => {
  const { readonly } = useContext(WorkflowStepFilterContext);

  const { currentStepFilterGroup, childStepFilters } =
    useChildStepFiltersAndChildStepFilterGroups({
      stepFilterGroupId,
    });

  if (!currentStepFilterGroup) {
    return null;
  }

  const hasParentStepFilterGroup = isDefined(
    currentStepFilterGroup.parentStepFilterGroupId,
  );

  return (
    <div
      {...stylex.props(
        styles.root,
        hasParentStepFilterGroup && styles.grayBackground,
      )}
    >
      {(childStepFilters ?? []).map((childStepFilter, childStepFilterIndex) => (
        <WorkflowStepFilterColumn
          key={childStepFilter.id}
          stepFilter={childStepFilter}
          stepFilterIndex={childStepFilterIndex}
          stepFilterGroup={currentStepFilterGroup}
        />
      ))}
      {!readonly && (
        <WorkflowStepFilterAddFilterRuleSelect
          stepFilterGroup={currentStepFilterGroup}
        />
      )}
    </div>
  );
};
