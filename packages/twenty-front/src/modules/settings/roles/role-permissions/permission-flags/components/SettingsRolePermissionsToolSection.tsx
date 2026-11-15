import { SettingsOptionCardContentSwitch } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSwitch';
import { SettingsRolePermissionsSettingsTableHeader } from '@/settings/roles/role-permissions/permission-flags/components/SettingsRolePermissionsSettingsTableHeader';
import { SettingsRolePermissionsSettingsTableRow } from '@/settings/roles/role-permissions/permission-flags/components/SettingsRolePermissionsSettingsTableRow';
import { useActionRolePermissionFlagConfig } from '@/settings/roles/role-permissions/permission-flags/hooks/useActionRolePermissionFlagConfig';
import { useRolePermissionFlagConfig } from '@/settings/roles/role-permissions/permission-flags/hooks/useRolePermissionFlagConfig';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';
import { t } from '@lingui/core/macro';

import { Section } from 'twenty-ui/components/layout';
import { IconTool } from 'twenty-ui/icon';
import { Collapsible } from 'twenty-ui/primitives/layout';
import { Card } from 'twenty-ui/primitives/surfaces';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  table: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
  },
  tableRows: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  cardContainer: {
    marginBottom: spacing['--t-spacing-4'],
  },
});

type SettingsRolePermissionsToolSectionProps = {
  roleId: string;
  isEditable: boolean;
};

export const SettingsRolePermissionsToolSection = ({
  roleId,
  isEditable,
}: SettingsRolePermissionsToolSectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const setSettingsDraftRole = useSetAtomFamilyState(
    settingsDraftRoleFamilyState,
    roleId,
  );

  const standardToolPermissionsConfig = useActionRolePermissionFlagConfig({
    assignmentCapabilities: {
      canBeAssignedToAgents: settingsDraftRole.canBeAssignedToAgents,
      canBeAssignedToUsers: settingsDraftRole.canBeAssignedToUsers,
      canBeAssignedToApiKeys: settingsDraftRole.canBeAssignedToApiKeys,
    },
  });

  const toolPermissionsConfig = useRolePermissionFlagConfig({
    permissionType: 'tool',
    standardPermissionsConfig: standardToolPermissionsConfig,
  });

  const shouldShowAllAccessToggle =
    !settingsDraftRole.canBeAssignedToAgents ||
    settingsDraftRole.canBeAssignedToUsers;

  return (
    <Section.Root>
      <Section.Header title={t`Logic`} description={t`Logic permissions`} />
      {shouldShowAllAccessToggle && (
        <div {...stylex.props(styles.cardContainer)}>
          <Card.Root rounded>
            <SettingsOptionCardContentSwitch
              Icon={IconTool}
              title={t`Logic All Access`}
              description={t`Full access to logic permissions`}
              checked={settingsDraftRole.canAccessAllTools}
              disabled={!isEditable}
              onChange={() => {
                setSettingsDraftRole({
                  ...settingsDraftRole,
                  canAccessAllTools: !settingsDraftRole.canAccessAllTools,
                });
              }}
            />
          </Card.Root>
        </div>
      )}
      <Collapsible.Root
        open={
          !shouldShowAllAccessToggle || !settingsDraftRole.canAccessAllTools
        }
      >
        <Collapsible.Panel
          dimension="height"
          style={{ transitionDuration: '0.4s, 0.2s' }}
          containAnimation={false}
        >
          <div {...stylex.props(styles.table)}>
            <SettingsRolePermissionsSettingsTableHeader
              roleId={roleId}
              settingsPermissionsConfig={toolPermissionsConfig}
              isEditable={isEditable}
            />
            <div {...stylex.props(styles.tableRows)}>
              {toolPermissionsConfig.map((permission) => (
                <SettingsRolePermissionsSettingsTableRow
                  key={permission.key}
                  roleId={roleId}
                  permission={permission}
                  isEditable={isEditable}
                />
              ))}
            </div>
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </Section.Root>
  );
};
