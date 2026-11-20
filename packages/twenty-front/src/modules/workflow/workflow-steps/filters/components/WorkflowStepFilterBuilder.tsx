import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { WorkflowEditActionFilterBodyEffect } from '@/workflow/workflow-steps/filters/components/WorkflowEditActionFilterBodyEffect';
import { WorkflowStepFilterAddFilterRuleSelect } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterAddFilterRuleSelect';
import { WorkflowStepFilterAddRootStepFilterButton } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterAddRootStepFilterButton';
import { WorkflowStepFilterColumn } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterColumn';
import { WorkflowStepFilterGroupColumn } from '@/workflow/workflow-steps/filters/components/WorkflowStepFilterGroupColumn';
import { useChildStepFiltersAndChildStepFilterGroups } from '@/workflow/workflow-steps/filters/hooks/useChildStepFiltersAndChildStepFilterGroups';
import { StepFilterGroupsComponentInstanceContext } from '@/workflow/workflow-steps/filters/states/context/StepFilterGroupsComponentInstanceContext';
import { StepFiltersComponentInstanceContext } from '@/workflow/workflow-steps/filters/states/context/StepFiltersComponentInstanceContext';
import { WorkflowStepFilterContext } from '@/workflow/workflow-steps/filters/states/context/WorkflowStepFilterContext';
import { rootLevelStepFilterGroupComponentSelector } from '@/workflow/workflow-steps/filters/states/rootLevelStepFilterGroupComponentSelector';
import {
  type FilterSettings,
  type FilterSettingsWithPotentiallyDeprecatedOperand,
} from '@/workflow/workflow-steps/filters/types/FilterSettings';
import { isStepFilterGroupChildAStepFilterGroup } from '@/workflow/workflow-steps/filters/utils/isStepFilterGroupChildAStepFilterGroup';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'start',
    display: 'flex',
    flexDirection: 'column',
  },
  childContainer: {
    gap: spacing['--t-spacing-6'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  conditions: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: spacing['--t-spacing-0'],
  },
});

type WorkflowStepFilterBuilderProps = {
  instanceId: string;
  defaultValue?: FilterSettingsWithPotentiallyDeprecatedOperand;
  readonly?: boolean;
  onFilterSettingsUpdate: (filterSettings: FilterSettings) => void;
};

const WorkflowStepFilterBuilderConditions = ({
  readonly,
}: {
  readonly?: boolean;
}) => {
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
            {childStepFiltersAndChildStepFilterGroups.map(
              (stepFilterGroupChild, stepFilterGroupChildIndex) =>
                isStepFilterGroupChildAStepFilterGroup(stepFilterGroupChild) ? (
                  <WorkflowStepFilterGroupColumn
                    key={stepFilterGroupChild.id}
                    parentStepFilterGroup={rootStepFilterGroup}
                    stepFilterGroup={stepFilterGroupChild}
                    stepFilterGroupIndex={stepFilterGroupChildIndex}
                  />
                ) : (
                  <WorkflowStepFilterColumn
                    key={stepFilterGroupChild.id}
                    stepFilterGroup={rootStepFilterGroup}
                    stepFilter={stepFilterGroupChild}
                    stepFilterIndex={stepFilterGroupChildIndex}
                  />
                ),
            )}
          </div>
          {!readonly && (
            <WorkflowStepFilterAddFilterRuleSelect
              stepFilterGroup={rootStepFilterGroup}
            />
          )}
        </div>
      ) : (
        <WorkflowStepFilterAddRootStepFilterButton />
      )}
    </div>
  );
};

export const WorkflowStepFilterBuilder = ({
  instanceId,
  defaultValue,
  readonly,
  onFilterSettingsUpdate,
}: WorkflowStepFilterBuilderProps) => {
  return (
    <StepFiltersComponentInstanceContext.Provider value={{ instanceId }}>
      <StepFilterGroupsComponentInstanceContext.Provider value={{ instanceId }}>
        <WorkflowStepFilterContext.Provider
          value={{
            stepId: instanceId,
            readonly,
            onFilterSettingsUpdate,
          }}
        >
          <WorkflowStepFilterBuilderConditions readonly={readonly} />
        </WorkflowStepFilterContext.Provider>
        <WorkflowEditActionFilterBodyEffect defaultValue={defaultValue} />
      </StepFilterGroupsComponentInstanceContext.Provider>
    </StepFiltersComponentInstanceContext.Provider>
  );
};
