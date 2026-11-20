import { AppChip } from '@/applications/components/AppChip';
import { getApplicationDisplayName } from '@/applications/utils/getApplicationDisplayName';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { type ConnectedAccountGroup } from '@/settings/app-preferences/types/ConnectedAccountGroup';
import { getNativeAccountAppsUsingAccount } from '@/settings/app-preferences/utils/getNativeAccountAppsUsingAccount';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  usedBy: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
  },
  usage: {
    display: 'flex',
  },
});

type Usage = {
  key: string;
  title: string;
  icon: ReactNode;
};

type SettingsAccountGroupUsedByProps = {
  group: ConnectedAccountGroup;
};

export const SettingsAccountGroupUsedBy = ({
  group,
}: SettingsAccountGroupUsedByProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  const nativeUsages = getNativeAccountAppsUsingAccount(
    group.nativeAccount,
  ).map((app): Usage => ({
    key: app.id,
    title: t(app.name),
    icon: <app.Icon size={theme.icon.size.md} />,
  }));

  const applicationIds = new Set(
    group.appAccounts.map((account) => account.applicationId).filter(isDefined),
  );

  const appUsages = [...applicationIds].map((applicationId): Usage => {
    const application = currentWorkspace?.installedApplications.find(
      (installedApplication) => installedApplication.id === applicationId,
    );

    return {
      key: applicationId,
      title: isDefined(application)
        ? getApplicationDisplayName({ application, currentWorkspace })
        : t`Application`,
      icon: <AppChip applicationId={applicationId} chipOnly />,
    };
  });

  return (
    <div {...stylex.props(styles.usedBy)}>
      {[...nativeUsages, ...appUsages].map(({ key, title, icon }) => (
        <Tooltip key={key} content={title}>
          <span role="img" aria-label={title} {...stylex.props(styles.usage)}>
            {icon}
          </span>
        </Tooltip>
      ))}
    </div>
  );
};
