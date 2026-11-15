import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { t } from '@lingui/core/macro';
import { type StepFilter } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { CoreWorkflowFilterAddRuleButton } from '@/object-core/workflows/components/CoreWorkflowFilterAddRuleButton';
import { CoreWorkflowFilterColumn } from '@/object-core/workflows/components/CoreWorkflowFilterColumn';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { WorkflowEditActionFilterBodyEffect } from '@/workflow/workflow-steps/filters/components/WorkflowEditActionFilterBodyEffect';
import { WorkflowStepFilterAddRootStepFilterButton } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterAddRootStepFilterButton';
import { useChildStepFiltersAndChildStepFilterGroups } from '@/workflow/workflow-steps/filters/hooks/useChildStepFiltersAndChildStepFilterGroups';
import { StepFilterGroupsComponentInstanceContext } from '@/workflow/workflow-steps/filters/states/context/StepFilterGroupsComponentInstanceContext';
import { StepFiltersComponentInstanceContext } from '@/workflow/workflow-steps/filters/states/context/StepFiltersComponentInstanceContext';
import { WorkflowStepFilterContext } from '@/workflow/workflow-steps/filters/states/context/WorkflowStepFilterContext';
import { rootLevelStepFilterGroupComponentSelector } from '@/workflow/workflow-steps/filters/states/rootLevelStepFilterGroupComponentSelector';
import { type FilterSettings } from '@/workflow/workflow-steps/filters/types/FilterSettings';
import { isStepFilterGroupChildAStepFilterGroup } from '@/workflow/workflow-steps/filters/utils/isStepFilterGroupChildAStepFilterGroup';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'start',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  childContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-6'],
    width: '100%',
  },
  conditions: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: spacing['--t-spacing-0'],
  },
});

type CoreWorkflowFiltersBuilderProps = {
  instanceId: string;
  defaultValue?: FilterSettings;
  onFilterSettingsUpdate: (filterSettings: FilterSettings) => void;
};

const CoreWorkflowFiltersBuilderConditions = () => {
  const rootStepFilterGroup = useAtomComponentSelectorValue(
    rootLevelStepFilterGroupComponentSelector,
  );

  const { childStepFiltersAndChildStepFilterGroups } =
    useChildStepFiltersAndChildStepFilterGroups({
      stepFilterGroupId: rootStepFilterGroup?.id ?? '',
    });

  return (
    <div {...stylex.props(styles.conditions)}>
      <InputLabel>{t`Conditions`}</InputLabel>
      {isDefined(rootStepFilterGroup) ? (
        <div {...stylex.props(styles.container)}>
          <div {...stylex.props(styles.childContainer)}>
            {childStepFiltersAndChildStepFilterGroups
              .filter(
                (stepFilterGroupChild): stepFilterGroupChild is StepFilter =>
                  !isStepFilterGroupChildAStepFilterGroup(stepFilterGroupChild),
              )
              .map((stepFilter, stepFilterIndex) => (
                <CoreWorkflowFilterColumn
                  key={stepFilter.id}
                  stepFilterGroup={rootStepFilterGroup}
                  stepFilter={stepFilter}
                  stepFilterIndex={stepFilterIndex}
                />
              ))}
          </div>
          <CoreWorkflowFilterAddRuleButton
            stepFilterGroup={rootStepFilterGroup}
          />
        </div>
      ) : (
        <WorkflowStepFilterAddRootStepFilterButton />
      )}
    </div>
  );
};

export const CoreWorkflowFiltersBuilder = ({
  instanceId,
  defaultValue,
  onFilterSettingsUpdate,
}: CoreWorkflowFiltersBuilderProps) => {
  return (
    <StepFiltersComponentInstanceContext.Provider value={{ instanceId }}>
      <StepFilterGroupsComponentInstanceContext.Provider value={{ instanceId }}>
        <WorkflowStepFilterContext.Provider
          value={{
            stepId: instanceId,
            onFilterSettingsUpdate,
          }}
        >
          <CoreWorkflowFiltersBuilderConditions />
        </WorkflowStepFilterContext.Provider>
        <WorkflowEditActionFilterBodyEffect defaultValue={defaultValue} />
      </StepFilterGroupsComponentInstanceContext.Provider>
    </StepFiltersComponentInstanceContext.Provider>
  );
};
