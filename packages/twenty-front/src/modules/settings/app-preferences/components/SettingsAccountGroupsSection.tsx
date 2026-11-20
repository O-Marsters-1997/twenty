import { SettingsAccountGroupTableRow } from '@/settings/app-preferences/components/SettingsAccountGroupTableRow';
import { SettingsAppPreferencesListEmptyStateCard } from '@/settings/app-preferences/components/SettingsAppPreferencesListEmptyStateCard';
import { SETTINGS_ACCOUNT_GROUP_TABLE_GRID_TEMPLATE_COLUMNS } from '@/settings/app-preferences/constants/SettingsAccountGroupTableGridTemplateColumns';
import { SETTINGS_NATIVE_ACCOUNT_APP_ACCOUNT_GROUP_TABLE_GRID_TEMPLATE_COLUMNS } from '@/settings/app-preferences/constants/SettingsNativeAccountAppAccountGroupTableGridTemplateColumns';
import { useMyAccountGroups } from '@/settings/app-preferences/hooks/useMyAccountGroups';
import { type NativeAccountApp } from '@/settings/app-preferences/types/NativeAccountApp';
import { getNativeAccountAppsUsingAccount } from '@/settings/app-preferences/utils/getNativeAccountAppsUsingAccount';
import { SettingsSectionSkeletonLoader } from '@/settings/components/SettingsSectionSkeletonLoader';
import { Table } from '@/ui/layout/table/components/Table';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  tableRows: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  addAccountContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    paddingTop: spacing['--t-spacing-2'],
  },
});

type SettingsAccountGroupsSectionProps = {
  nativeAccountApp?: NativeAccountApp;
};

export const SettingsAccountGroupsSection = ({
  nativeAccountApp,
}: SettingsAccountGroupsSectionProps) => {
  const { t } = useLingui();
  const navigateSettings = useNavigateSettings();
  const { groups: allGroups, loading } = useMyAccountGroups();

  const groups = isDefined(nativeAccountApp)
    ? allGroups.filter((group) =>
        getNativeAccountAppsUsingAccount(group.nativeAccount).some(
          (app) => app.id === nativeAccountApp.id,
        ),
      )
    : allGroups;

  const gridTemplateColumns = isDefined(nativeAccountApp)
    ? SETTINGS_NATIVE_ACCOUNT_APP_ACCOUNT_GROUP_TABLE_GRID_TEMPLATE_COLUMNS
    : SETTINGS_ACCOUNT_GROUP_TABLE_GRID_TEMPLATE_COLUMNS;

  if (loading) {
    return <SettingsSectionSkeletonLoader />;
  }

  return (
    <Section.Root>
      <Section.Header
        title={t`Accounts`}
        description={t`Shared accounts between apps`}
      />
      {groups.length === 0 ? (
        <SettingsAppPreferencesListEmptyStateCard
          provider={nativeAccountApp?.provider}
        />
      ) : (
        <>
          <Table>
            <TableRow gridTemplateColumns={gridTemplateColumns}>
              <TableHeader>{t`Account`}</TableHeader>
              {isDefined(nativeAccountApp) ? (
                <TableHeader>{t`Permissions`}</TableHeader>
              ) : (
                <TableHeader align="right">{t`Used by`}</TableHeader>
              )}
              <TableHeader />
            </TableRow>
            <div {...stylex.props(styles.tableRows)}>
              {groups.map((group) => (
                <SettingsAccountGroupTableRow
                  key={group.id}
                  group={group}
                  gridTemplateColumns={gridTemplateColumns}
                  nativeAccountApp={nativeAccountApp}
                />
              ))}
            </div>
          </Table>
          <div {...stylex.props(styles.addAccountContainer)}>
            <Button
              startIcon={<IconPlus />}
              size="sm"
              onClick={() => navigateSettings(SettingsPath.NewAccount)}
              variant="outline"
            >{t`Add account`}</Button>
          </div>
        </>
      )}
    </Section.Root>
  );
};
