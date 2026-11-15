import { DEFAULT_ADVANCED_FILTER_DROPDOWN_SIDE_OFFSET } from '@/object-record/advanced-filter/constants/DefaultAdvancedFilterDropdownSideOffset';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useUpsertStepFilterSettings } from '@/workflow/workflow-steps/filters/hooks/useUpsertStepFilterSettings';
import { WorkflowStepFilterContext } from '@/workflow/workflow-steps/filters/states/context/WorkflowStepFilterContext';

import { useLingui } from '@lingui/react/macro';
import { useContext, useMemo } from 'react';
import { StepLogicalOperator, type StepFilterGroup } from 'twenty-shared/types';
import { capitalize, isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { font, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  text: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    height: spacing['--t-spacing-8'],
  },
  number: {
    color: fontColor['--t-font-color-tertiary'],
    marginRight: spacing['--t-spacing-1'],
  },
  container: {
    alignItems: 'start',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    minWidth: spacing['--t-spacing-20'],
  },
});

type WorkflowStepFilterLogicalOperatorCellProps = {
  index: number;
  stepFilterGroup: StepFilterGroup;
  firstFilterLabel?: string;
  elseIfIndex?: number;
};

export const WorkflowStepFilterLogicalOperatorCell = ({
  index,
  stepFilterGroup,
  firstFilterLabel,
  elseIfIndex,
}: WorkflowStepFilterLogicalOperatorCellProps) => {
  const { readonly } = useContext(WorkflowStepFilterContext);
  const { t } = useLingui();
  const defaultFirstFilterLabel = t`Where`;

  const { upsertStepFilterSettings } = useUpsertStepFilterSettings();

  const stepFilterLogicalOperatorOptions = useMemo(
    () => [
      {
        value: StepLogicalOperator.AND,
        label: t`And`,
      },
      {
        value: StepLogicalOperator.OR,
        label: t`Or`,
      },
    ],
    [t],
  );

  const handleChange = (value: StepLogicalOperator) => {
    upsertStepFilterSettings({
      stepFilterGroupToUpsert: {
        id: stepFilterGroup.id,
        parentStepFilterGroupId: stepFilterGroup.parentStepFilterGroupId,
        positionInStepFilterGroup: stepFilterGroup.positionInStepFilterGroup,
        logicalOperator: value,
      },
    });
  };

  return (
    <div {...stylex.props(styles.container)}>
      {index === 0 ? (
        <div {...stylex.props(styles.text)}>
          {isDefined(elseIfIndex) && <span {...stylex.props(styles.number)}>{elseIfIndex}</span>}
          {firstFilterLabel ?? defaultFirstFilterLabel}
        </div>
      ) : index === 1 ? (
        readonly ? (
          <Select
            dropdownWidth={GenericDropdownContentWidth.Narrow}
            dropdownId={`advanced-filter-logical-operator-${stepFilterGroup.id}`}
            value={stepFilterGroup.logicalOperator}
            options={stepFilterLogicalOperatorOptions}
            dropdownSideOffset={DEFAULT_ADVANCED_FILTER_DROPDOWN_SIDE_OFFSET}
            disabled
          />
        ) : (
          <Select
            dropdownWidth={GenericDropdownContentWidth.Narrow}
            dropdownId={`advanced-filter-logical-operator-${stepFilterGroup.id}`}
            value={stepFilterGroup.logicalOperator}
            onChange={handleChange}
            options={stepFilterLogicalOperatorOptions}
            dropdownSideOffset={DEFAULT_ADVANCED_FILTER_DROPDOWN_SIDE_OFFSET}
          />
        )
      ) : (
        <div {...stylex.props(styles.text)}>
          {capitalize(stepFilterGroup.logicalOperator.toLowerCase())}
        </div>
      )}
    </div>
  );
};
