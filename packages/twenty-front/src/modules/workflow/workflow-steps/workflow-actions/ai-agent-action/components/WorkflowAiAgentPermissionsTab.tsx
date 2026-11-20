import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import '@/workflow/workflow-steps/workflow-actions/components/workflowActionDescendantOverrides.css';
import { useActionRolePermissionFlagConfig } from '@/settings/roles/role-permissions/permission-flags/hooks/useActionRolePermissionFlagConfig';
import { SidePanelSubPageNavigationHeader } from '@/side-panel/pages/common/components/SidePanelSubPageNavigationHeader';
import { TextInput } from '@/ui/input/components/TextInput';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type WorkflowAiAgentAction } from '@/workflow/types/Workflow';
import { useWorkflowAiAgentPermissionActions } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/hooks/useWorkflowAiAgentPermissionActions';
import { workflowAiAgentActionAgentState } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/states/workflowAiAgentActionAgentState';
import { workflowAiAgentPermissionsIsAddingPermissionState } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/states/workflowAiAgentPermissionsIsAddingPermissionState';
import { workflowAiAgentPermissionsIsSystemObjectsListOpenState } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/states/workflowAiAgentPermissionsIsSystemObjectsListOpenState';
import { workflowAiAgentPermissionsSelectedObjectIdState } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/states/workflowAiAgentPermissionsSelectedObjectIdState';
import { useQuery } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { type Agent, GetRoleDocument } from '~/generated-metadata/graphql';
import { SidePanelSkeletonLoader } from '~/loading/components/SidePanelSkeletonLoader';
import { filterBySearchQuery } from '~/utils/filterBySearchQuery';

import { isNonTextWritingKey } from '@/ui/utilities/hotkey/utils/isNonTextWritingKey';
import { WorkflowAiAgentPermissionList } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/components/WorkflowAiAgentPermissionList';
import { CRUD_PERMISSIONS } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/constants/WorkflowAiAgentCrudPermissions';
import { themeCssVariables } from 'twenty-ui/theme';
import { WorkflowAiAgentPermissionsCrudList } from './WorkflowAiAgentPermissionsCrudList';
import { WorkflowAiAgentPermissionsFlagList } from './WorkflowAiAgentPermissionsFlagList';
import { WorkflowAiAgentPermissionsObjectsList } from './WorkflowAiAgentPermissionsObjectsList';
import { getFilteredPermissions } from './workflowAiAgentPermissions.utils';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  backgroundTransparent,
  borderColor,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  searchInputContainer: {
    borderBlockStyle: 'solid',
    paddingInline: spacing['--t-spacing-2'],
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderBlockColor: borderColor['--t-border-color-medium'],
    borderBlockWidth: '1px',
    boxSizing: 'border-box',
    height: '40px',
    width: '100%',
  },

  container: {
    width: '100%',
  },
  groupsContainer: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

type WorkflowAiAgentPermissionsTabProps = {
  action: WorkflowAiAgentAction;
  readonly: boolean;
  isAgentLoading: boolean;
  refetchAgent: () => Promise<{ data?: { findOneAgent?: Agent } }>;
};

export const WorkflowAiAgentPermissionsTab = ({
  readonly,
  isAgentLoading,
  refetchAgent,
}: WorkflowAiAgentPermissionsTabProps) => {
  const workflowAiAgentActionAgent = useAtomStateValue(
    workflowAiAgentActionAgentState,
  );

  const [
    workflowAiAgentPermissionsSelectedObjectId,
    setWorkflowAiAgentPermissionsSelectedObjectId,
  ] = useAtomState(workflowAiAgentPermissionsSelectedObjectIdState);
  const [
    workflowAiAgentPermissionsIsAddingPermission,
    setWorkflowAiAgentPermissionsIsAddingPermission,
  ] = useAtomState(workflowAiAgentPermissionsIsAddingPermissionState);
  const [
    workflowAiAgentPermissionsIsSystemObjectsListOpen,
    setWorkflowAiAgentPermissionsIsSystemObjectsListOpen,
  ] = useAtomState(workflowAiAgentPermissionsIsSystemObjectsListOpenState);

  const {
    alphaSortedActiveNonSystemObjectMetadataItems: objectMetadataItems,
    objectMetadataItems: allObjectMetadataItems,
  } = useFilteredObjectMetadataItems();

  const systemObjectMetadataItems = allObjectMetadataItems
    .filter((item) => item.isActive && item.isSystem)
    .sort((itemA, itemB) =>
      itemA.nameSingular.localeCompare(itemB.nameSingular),
    );

  const agentRoleId = workflowAiAgentActionAgent?.roleId;
  const {
    data: roleData,
    loading: roleLoading,
    refetch: refetchRole,
  } = useQuery(GetRoleDocument, {
    variables: { id: agentRoleId ?? '' },
    skip: !isDefined(agentRoleId),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const role = roleData?.getRole;
  const objectPermissions = role?.objectPermissions || [];
  const permissionFlagKeys =
    role?.permissionFlags?.map((permissionFlag) => permissionFlag.flag) ?? [];
  const hasRoleWithPermissions =
    isDefined(workflowAiAgentActionAgent?.roleId) &&
    (objectPermissions.length > 0 || permissionFlagKeys.length > 0);
  const actionPermissionsConfig = useActionRolePermissionFlagConfig({
    assignmentCapabilities: { canBeAssignedToAgents: true },
  });

  type ObjectMetadataListItem = (typeof objectMetadataItems)[number];
  const filteredObjects = filterBySearchQuery<ObjectMetadataListItem>({
    items: objectMetadataItems,
    searchQuery,
    getSearchableValues: (item) => [item.labelSingular, item.labelPlural],
  });

  const filteredSystemObjects = filterBySearchQuery({
    items: systemObjectMetadataItems,
    searchQuery,
    getSearchableValues: (item) => [item.labelSingular, item.labelPlural],
  });

  const {
    filteredPermissions: filteredActionPermissions,
    filteredEnabledPermissions: filteredEnabledActionPermissions,
  } = getFilteredPermissions({
    permissions: actionPermissionsConfig,
    permissionFlagKeys,
    searchQuery,
  });

  const refetchAgentAndRoles = async () => {
    const result = await refetchAgent();
    const refetchedAgent = result?.data?.findOneAgent;

    // The role may have just been created, so the query can still be skipped or bound to a stale id
    if (isDefined(refetchedAgent?.roleId)) {
      await refetchRole({ id: refetchedAgent.roleId });
    }

    return { refetchedAgent };
  };

  const {
    handleAddPermission,
    handleDeletePermission,
    handleAddPermissionFlag,
    handleDeletePermissionFlag,
  } = useWorkflowAiAgentPermissionActions({
    readonly,
    objectPermissions,
    permissionFlagKeys,
    refetchAgentAndRoles,
  });

  if (isAgentLoading || roleLoading) {
    return <SidePanelSkeletonLoader />;
  }

  if (!isDefined(workflowAiAgentActionAgent)) {
    return null;
  }

  const selectedObject = isDefined(workflowAiAgentPermissionsSelectedObjectId)
    ? allObjectMetadataItems.find(
        (item) => item.id === workflowAiAgentPermissionsSelectedObjectId,
      )
    : undefined;

  const objectPermissionForSelected = isDefined(selectedObject)
    ? objectPermissions.find(
        (permission) => permission.objectMetadataId === selectedObject.id,
      )
    : undefined;

  const handleBack = () => {
    if (isDefined(workflowAiAgentPermissionsSelectedObjectId)) {
      setWorkflowAiAgentPermissionsSelectedObjectId(undefined);
      return;
    }

    if (workflowAiAgentPermissionsIsSystemObjectsListOpen) {
      setWorkflowAiAgentPermissionsIsSystemObjectsListOpen(false);
      return;
    }

    setWorkflowAiAgentPermissionsIsAddingPermission(false);
  };

  const handleObjectClick = (objectId: string) => {
    setWorkflowAiAgentPermissionsSelectedObjectId(objectId);
  };

  const shouldShowBackButton =
    isDefined(workflowAiAgentPermissionsSelectedObjectId) ||
    workflowAiAgentPermissionsIsSystemObjectsListOpen ||
    workflowAiAgentPermissionsIsAddingPermission;
  const shouldShowCrudList = isDefined(selectedObject);
  const shouldShowSelectionLists =
    (!hasRoleWithPermissions || workflowAiAgentPermissionsIsAddingPermission) &&
    !isDefined(selectedObject);
  const shouldShowExistingPermissions =
    hasRoleWithPermissions && !workflowAiAgentPermissionsIsAddingPermission;

  return (
    <div {...stylex.props(styles.container)}>
      {shouldShowBackButton && (
        <div data-workflow-permissions-back-button>
          <SidePanelSubPageNavigationHeader
            title={t`Add permission`}
            onBackClick={handleBack}
          />
        </div>
      )}

      <div
        data-workflow-permissions-search
        {...stylex.props(styles.searchInputContainer)}
      >
        <TextInput
          fullWidth
          value={searchQuery}
          onChange={(value: string) => setSearchQuery(value)}
          placeholder={t`Type anything...`}
          onKeyDown={(event) => {
            if (isNonTextWritingKey(event.key)) {
              event.stopPropagation();
            }
          }}
        />
      </div>

      <div {...stylex.props(styles.groupsContainer)}>
        {shouldShowCrudList && (
          <WorkflowAiAgentPermissionsCrudList
            permissions={filterBySearchQuery({
              items: CRUD_PERMISSIONS.map((p) => ({
                key: p.key,
                label: p.label(selectedObject.labelPlural),
              })),
              searchQuery,
              getSearchableValues: (permission) => [permission.label],
            })}
            objectPermissions={objectPermissionForSelected}
            readonly={readonly}
            onAddPermission={handleAddPermission}
            objectMetadataId={selectedObject.id}
          />
        )}

        {shouldShowSelectionLists &&
          (workflowAiAgentPermissionsIsSystemObjectsListOpen ? (
            <WorkflowAiAgentPermissionsObjectsList
              heading={t`System objects`}
              objects={filteredSystemObjects}
              onObjectClick={handleObjectClick}
              readonly={readonly}
            />
          ) : (
            <>
              <WorkflowAiAgentPermissionsObjectsList
                objects={filteredObjects}
                onObjectClick={handleObjectClick}
                onSystemObjectsClick={() =>
                  setWorkflowAiAgentPermissionsIsSystemObjectsListOpen(true)
                }
                readonly={readonly}
              />
              <WorkflowAiAgentPermissionsFlagList
                title={t`Actions`}
                permissions={filteredActionPermissions}
                enabledPermissionFlagKeys={permissionFlagKeys}
                readonly={readonly}
                onAddPermissionFlag={handleAddPermissionFlag}
              />
            </>
          ))}

        {shouldShowExistingPermissions && (
          <>
            <WorkflowAiAgentPermissionList
              readonly={readonly}
              objectPermissions={objectPermissions}
              onDeletePermission={handleDeletePermission}
              searchQuery={searchQuery}
            />
            <WorkflowAiAgentPermissionsFlagList
              title={t`Actions`}
              permissions={filteredEnabledActionPermissions}
              enabledPermissionFlagKeys={permissionFlagKeys}
              readonly={readonly}
              showDeleteButton={!readonly}
              onDeletePermissionFlag={handleDeletePermissionFlag}
            />
          </>
        )}
      </div>
    </div>
  );
};
