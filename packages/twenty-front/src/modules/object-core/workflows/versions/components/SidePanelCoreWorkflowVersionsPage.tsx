import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';

import { CoreWorkflowVersionsListItem } from '@/object-core/workflows/versions/components/CoreWorkflowVersionsListItem';
import { useCoreWorkflowVersions } from '@/object-core/workflows/versions/hooks/useCoreWorkflowVersions';
import { useOpenCoreWorkflowVersionSidePanel } from '@/object-core/workflows/versions/hooks/useOpenCoreWorkflowVersionSidePanel';
import { useSidePanelWorkflowIdOrThrow } from '@/side-panel/pages/workflow/hooks/useSidePanelWorkflowIdOrThrow';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { SidePanelList } from '@/side-panel/components/SidePanelList';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  error: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
  },
});

export const SidePanelCoreWorkflowVersionsPage = () => {
  const { t } = useLingui();
  const workflowId = useSidePanelWorkflowIdOrThrow();
  const { coreWorkflowVersions, loading, error } =
    useCoreWorkflowVersions(workflowId);
  const { openCoreWorkflowVersionSidePanel } =
    useOpenCoreWorkflowVersionSidePanel();

  const selectableCoreWorkflowVersionIds = coreWorkflowVersions.map(
    ({ id }) => id,
  );

  return (
    <SidePanelList
      selectableItemIds={selectableCoreWorkflowVersionIds}
      loading={loading}
      noResults={
        !loading && !isDefined(error) && coreWorkflowVersions.length === 0
      }
    >
      {isDefined(error) && (
        <div {...stylex.props(styles.error)}>{t`Could not load versions.`}</div>
      )}
      <SidePanelGroup heading={t`Versions`}>
        {coreWorkflowVersions.map((coreWorkflowVersion) => (
          <CoreWorkflowVersionsListItem
            key={coreWorkflowVersion.id}
            id={coreWorkflowVersion.id}
            label={coreWorkflowVersion.label}
            createdAt={coreWorkflowVersion.createdAt}
            status={coreWorkflowVersion.status}
            onSelect={() => {
              openCoreWorkflowVersionSidePanel({
                coreWorkflowVersionId: coreWorkflowVersion.id,
                pageTitle: coreWorkflowVersion.label,
              });
            }}
          />
        ))}
      </SidePanelGroup>
    </SidePanelList>
  );
};
