import { type ConnectedAccount } from '@/accounts/types/ConnectedAccount';
import { SettingsAccountsRowDropdownMenu } from '@/settings/accounts/components/SettingsAccountsRowDropdownMenu';
import { SyncStatus } from '@/settings/accounts/constants/SyncStatus';
import { computeSyncStatus } from '@/settings/accounts/utils/computeSyncStatus';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { Status } from 'twenty-ui/primitives/data-display';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  rowRightContainer: {
    gap: spacing['--t-spacing-4'],
    alignItems: 'center',
    display: 'flex',
  },
});

export const SettingsAccountsConnectedAccountsRowRightContainer = ({
  account,
}: {
  account: ConnectedAccount;
}) => {
  const messageChannel = account.messageChannels[0];
  const calendarChannel = account.calendarChannels[0];

  const isArchived = isDefined(account.archivedAt);

  const status = computeSyncStatus(messageChannel, calendarChannel);

  // Archived accounts retain their synced data but cannot be synced until they
  // are reconnected, so the live sync status is no longer relevant.
  if (isArchived) {
    return (
      <div {...stylex.props(styles.rowRightContainer)}>
        <Status color="gray" weight="medium">{t`Sync paused`}</Status>
        <SettingsAccountsRowDropdownMenu account={account} />
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.rowRightContainer)}>
      {status === SyncStatus.FAILED && (
        <Status color="red" weight="medium">{t`Sync failed`}</Status>
      )}
      {status === SyncStatus.SYNCED && (
        <Status color="green" weight="medium">{t`Synced`}</Status>
      )}
      {status === SyncStatus.NOT_SYNCED && (
        <Status color="orange" weight="medium">{t`Not synced`}</Status>
      )}
      {status === SyncStatus.IMPORTING && (
        <Status
          color="turquoise"
          weight="medium"
          loading
        >{t`Importing`}</Status>
      )}
      {status === SyncStatus.PENDING_CONFIGURATION && (
        <Status color="orange" weight="medium">{t`Setup incomplete`}</Status>
      )}
      <SettingsAccountsRowDropdownMenu account={account} />
    </div>
  );
};
