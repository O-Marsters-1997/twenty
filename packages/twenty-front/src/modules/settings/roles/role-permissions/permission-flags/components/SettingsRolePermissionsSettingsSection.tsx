import { SettingsOptionCardContentSwitch } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSwitch';
import { SettingsRolePermissionsSettingsTableHeader } from '@/settings/roles/role-permissions/permission-flags/components/SettingsRolePermissionsSettingsTableHeader';
import { SettingsRolePermissionsSettingsTableRow } from '@/settings/roles/role-permissions/permission-flags/components/SettingsRolePermissionsSettingsTableRow';
import { useSettingsRolePermissionFlagConfig } from '@/settings/roles/role-permissions/permission-flags/hooks/useSettingsRolePermissionFlagConfig';
import { useRolePermissionFlagConfig } from '@/settings/roles/role-permissions/permission-flags/hooks/useRolePermissionFlagConfig';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';
import { t } from '@lingui/core/macro';
import { Section } from 'twenty-ui/components/layout';
import { IconSettings } from 'twenty-ui/icon';
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

type SettingsRolePermissionsSettingsSectionProps = {
  roleId: string;
  isEditable: boolean;
};

export const SettingsRolePermissionsSettingsSection = ({
  roleId,
  isEditable,
}: SettingsRolePermissionsSettingsSectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const setSettingsDraftRole = useSetAtomFamilyState(
    settingsDraftRoleFamilyState,
    roleId,
  );

  const standardSettingsPermissionsConfig = useSettingsRolePermissionFlagConfig(
    {
      assignmentCapabilities: {
        canBeAssignedToAgents: settingsDraftRole.canBeAssignedToAgents,
        canBeAssignedToUsers: settingsDraftRole.canBeAssignedToUsers,
        canBeAssignedToApiKeys: settingsDraftRole.canBeAssignedToApiKeys,
      },
    },
  );

  const settingsPermissionsConfig = useRolePermissionFlagConfig({
    permissionType: 'settings',
    standardPermissionsConfig: standardSettingsPermissionsConfig,
  });

  const shouldShowAllAccessToggle =
    !settingsDraftRole.canBeAssignedToAgents ||
    settingsDraftRole.canBeAssignedToUsers;

  return (
    <Section.Root>
      <Section.Header title={t`Layout`} description={t`Layout permissions`} />
      {shouldShowAllAccessToggle && (
        <div {...stylex.props(styles.cardContainer)}>
          <Card.Root rounded>
            <SettingsOptionCardContentSwitch
              Icon={IconSettings}
              title={t`Layout All Access`}
              description={t`Full access to layout permissions`}
              checked={settingsDraftRole.canUpdateAllSettings}
              disabled={!isEditable}
              onChange={() => {
                setSettingsDraftRole({
                  ...settingsDraftRole,
                  canUpdateAllSettings: !settingsDraftRole.canUpdateAllSettings,
                });
              }}
            />
          </Card.Root>
        </div>
      )}
      <Collapsible.Root
        open={
          !shouldShowAllAccessToggle || !settingsDraftRole.canUpdateAllSettings
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
              settingsPermissionsConfig={settingsPermissionsConfig}
              isEditable={isEditable}
            />
            <div {...stylex.props(styles.tableRows)}>
              {settingsPermissionsConfig.map((permission) => (
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
