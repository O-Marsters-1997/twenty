import { useIsThirdPartyApplication } from '@/applications/hooks/useIsThirdPartyApplication';
import { CoreWorkflowEditor } from '@/object-core/workflows/components/CoreWorkflowEditor';
import { CoreObjectIdentifierBar } from '@/object-core/components/CoreObjectIdentifierBar';
import { useRenameCoreWorkflow } from '@/object-core/workflows/hooks/useRenameCoreWorkflow';
import { isNonEmptyString } from '@sniptt/guards';
import { t } from '@lingui/core/macro';
import { useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { PermissionFlagType } from 'twenty-shared/constants';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/primitives/input';

import { WorkspaceRouteUnavailable } from '@/ui/layout/page/components/WorkspaceRouteUnavailable';
import { RecordShowCommandMenu } from '@/command-menu-item/components/RecordShowCommandMenu';
import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { useCoreWorkflowShowPageResource } from '@/object-core/workflows/hooks/useCoreWorkflowShowPageResource';
import { useListenToCoreWorkflowEvents } from '@/object-core/workflows/hooks/useListenToCoreWorkflowEvents';
import { useCoreWorkflowVersions } from '@/object-core/workflows/versions/hooks/useCoreWorkflowVersions';
import { invalidateCoreWorkflowVersions } from '@/object-core/workflows/versions/utils/invalidateCoreWorkflowVersions';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { CoreObjectNamePlural } from '@/object-metadata/types/CoreObjectNamePlural';
import { RecordShowPageResourceEffect } from '@/object-record/record-show/components/RecordShowPageResourceEffect';
import { RecordShowContainerContextStoreTargetedRecordsEffect } from '@/object-record/record-show/components/RecordShowContainerContextStoreTargetedRecordsEffect';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { SidePanelToggleButton } from '@/side-panel/components/SidePanelToggleButton';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { getWorkflowCurrentVersion } from '@/workflow/utils/getWorkflowCurrentVersion';
import { PageContentSkeletonLoader } from '~/loading/components/PageContentSkeletonLoader';
import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '0',
  },
  untitled: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

const CoreWorkflowShowContent = ({
  coreWorkflowId,
}: {
  coreWorkflowId: string;
}) => {
  const client = useApolloCoreClient();
  const { record, coreWorkflow, loading, error, refetch } =
    useCoreWorkflowShowPageResource({
      coreWorkflowId,
    });
  const isApplicationManaged = useIsThirdPartyApplication(
    coreWorkflow?.applicationId,
  );
  const versions = useCoreWorkflowVersions(coreWorkflowId);
  const { refetchCoreWorkflowVersions } = versions;

  const refetchCoreWorkflowAndVersions = useCallback(() => {
    void refetch();
    void refetchCoreWorkflowVersions();
  }, [refetch, refetchCoreWorkflowVersions]);

  useListenToCoreWorkflowEvents({
    coreWorkflowId,
    refetch: refetchCoreWorkflowAndVersions,
  });

  const [searchParams] = useSearchParams();
  const requestedVersionId = searchParams.get('version');
  const currentVersion = getWorkflowCurrentVersion({
    versions: versions.coreWorkflowVersions,
    lastPublishedVersionId: coreWorkflow?.lastPublishedCoreWorkflowVersionId,
  });
  const selectedVersion = isDefined(requestedVersionId)
    ? versions.coreWorkflowVersions.find(({ id }) => id === requestedVersionId)
    : currentVersion;
  const isReadOnlyVersion =
    isApplicationManaged || isDefined(requestedVersionId);
  const { renameWorkflow } = useRenameCoreWorkflow({
    coreWorkflowId,
    currentName: record?.name,
  });

  const resource = (
    <RecordShowPageResourceEffect
      recordId={coreWorkflowId}
      loading={loading}
      record={isDefined(error) ? undefined : record}
    />
  );

  if (
    (loading && !isDefined(record)) ||
    (versions.loading && versions.coreWorkflowVersions.length === 0)
  ) {
    return (
      <>
        {resource}
        <PageContentSkeletonLoader />
      </>
    );
  }
  if (isDefined(error) || isDefined(versions.error)) {
    return (
      <>
        {resource}
        <WorkspaceRouteUnavailable>
          {t`Could not load this workflow.`}
          <Button
            title={t`Retry`}
            onClick={() => invalidateCoreWorkflowVersions(client)}
          >
            {t`Retry`}
          </Button>
        </WorkspaceRouteUnavailable>
      </>
    );
  }
  if (!isDefined(record)) {
    return (
      <>
        {resource}
        <WorkspaceRouteUnavailable>{t`Workflow not found.`}</WorkspaceRouteUnavailable>
      </>
    );
  }

  return (
    <CommandMenuComponentInstanceContext.Provider
      value={{ instanceId: `core-workflow-${coreWorkflowId}` }}
    >
      {resource}
      <RecordShowContainerContextStoreTargetedRecordsEffect
        recordId={coreWorkflowId}
      />
      <PageTitle title={record.name ?? t`Workflow`} />
      <PageCardLayout
        header={
          <PageCardHeader
            links={[
              {
                children: t`Workflows`,
                href: getAppPath(AppPath.RecordIndexPage, {
                  objectNamePlural: CoreObjectNamePlural.Workflow,
                }),
              },
              {
                children: isNonEmptyString(record.name) ? (
                  record.name
                ) : (
                  <span {...stylex.props(styles.untitled)}>{t`Untitled`}</span>
                ),
              },
            ]}
            actionButton={
              <>
                {!isDefined(requestedVersionId) && <RecordShowCommandMenu />}
                <SidePanelToggleButton />
              </>
            }
          />
        }
      >
        <div {...stylex.props(styles.container)}>
          <CoreObjectIdentifierBar
            recordId={coreWorkflowId}
            name={record.name}
            namePlaceholder={t`Untitled`}
            onRename={renameWorkflow}
            isReadOnly={isApplicationManaged}
          />
          {isDefined(selectedVersion) ? (
            <CoreWorkflowEditor
              key={selectedVersion.id}
              coreWorkflowId={coreWorkflowId}
              coreWorkflowVersionId={selectedVersion.id}
              readonly={isReadOnlyVersion}
            />
          ) : (
            <WorkspaceRouteUnavailable>{t`Workflow version not found.`}</WorkspaceRouteUnavailable>
          )}
        </div>
      </PageCardLayout>
    </CommandMenuComponentInstanceContext.Provider>
  );
};

export const WorkflowCoreShowPage = () => {
  const { coreWorkflowId } = useParams<{ coreWorkflowId: string }>();
  const canManageWorkflows = useHasPermissionFlag(PermissionFlagType.WORKFLOWS);
  if (!canManageWorkflows) {
    return (
      <WorkspaceRouteUnavailable>{t`You do not have permission to access workflows.`}</WorkspaceRouteUnavailable>
    );
  }
  if (!isDefined(coreWorkflowId)) {
    return <WorkspaceRouteUnavailable />;
  }
  return (
    <CoreWorkflowShowContent
      key={coreWorkflowId}
      coreWorkflowId={coreWorkflowId}
    />
  );
};
