import { useAddRootStepFilter } from '@/workflow/workflow-steps/filters/hooks/useAddRootStepFilter';
import { WorkflowStepFilterContext } from '@/workflow/workflow-steps/filters/states/context/WorkflowStepFilterContext';
import { useLingui } from '@lingui/react/macro';
import { useContext } from 'react';
import { IconFilter } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  buttonContainer: {
    marginTop: spacing['--t-spacing-2'],
  },
});

export const WorkflowStepFilterAddRootStepFilterButton = () => {
  const { t } = useLingui();
  const { readonly } = useContext(WorkflowStepFilterContext);
  const { addRootStepFilter } = useAddRootStepFilter();

  return (
    <div {...stylex.props(styles.buttonContainer)}>
      <Button
        startIcon={<IconFilter />}
        size="sm"
        onClick={addRootStepFilter}
        aria-label={t`Add first filter`}
        disabled={readonly}
        variant="outline"
      >{t`Add first filter`}</Button>
    </div>
  );
};
