import { CoreWorkflowFiltersBuilder } from '@/object-core/workflows/components/CoreWorkflowFiltersBuilder';
import {
  CORE_WORKFLOWS_FILTER_INSTANCE_ID,
  coreWorkflowsFilterSettingsState,
} from '@/object-core/workflows/states/coreWorkflowsFilterSettingsState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

export const SidePanelCoreWorkflowFiltersPage = () => {
  const [coreWorkflowsFilterSettings, setCoreWorkflowsFilterSettings] =
    useAtomState(coreWorkflowsFilterSettingsState);

  return (
    <div {...stylex.props(styles.pageContainer)}>
      <CoreWorkflowFiltersBuilder
        instanceId={CORE_WORKFLOWS_FILTER_INSTANCE_ID}
        defaultValue={coreWorkflowsFilterSettings}
        onFilterSettingsUpdate={setCoreWorkflowsFilterSettings}
      />
    </div>
  );
};
