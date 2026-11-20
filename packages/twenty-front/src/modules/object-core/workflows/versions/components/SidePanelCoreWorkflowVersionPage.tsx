import { isDefined } from 'twenty-shared/utils';

import { CoreWorkflowVersionCard } from '@/object-core/workflows/versions/components/CoreWorkflowVersionCard';
import { CoreWorkflowVersionRestoreButton } from '@/object-core/workflows/versions/components/CoreWorkflowVersionRestoreButton';
import { useCoreWorkflowVersion } from '@/object-core/workflows/versions/hooks/useCoreWorkflowVersion';
import { useSidePanelWorkflowVersionIdOrThrow } from '@/side-panel/pages/workflow/step/view/hooks/useSidePanelWorkflowVersionIdOrThrow';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  actions: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-2'],
  },
  spacer: {
    marginLeft: 'auto',
  },
});

export const SidePanelCoreWorkflowVersionPage = () => {
  const coreWorkflowVersionId = useSidePanelWorkflowVersionIdOrThrow();
  const { coreWorkflowVersion } = useCoreWorkflowVersion(coreWorkflowVersionId);

  if (!isDefined(coreWorkflowVersion)) {
    return null;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.actions)}>
        <div {...stylex.props(styles.spacer)} />
        {isDefined(coreWorkflowVersion.coreWorkflowId) && (
          <CoreWorkflowVersionRestoreButton
            workflowId={coreWorkflowVersion.coreWorkflowId}
            coreWorkflowVersionId={coreWorkflowVersionId}
          />
        )}
      </div>
      <CoreWorkflowVersionCard coreWorkflowVersionId={coreWorkflowVersionId} />
    </div>
  );
};
