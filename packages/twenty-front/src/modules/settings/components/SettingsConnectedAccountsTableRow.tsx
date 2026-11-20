import { type ConnectedAccount } from '@/accounts/types/ConnectedAccount';
import { SettingsAccountsConnectedAccountsRowRightContainer } from '@/settings/accounts/components/SettingsAccountsConnectedAccountsRowRightContainer';
import { SettingsConnectedAccountIcon } from '@/settings/accounts/components/SettingsConnectedAccountIcon';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import * as stylex from '@stylexjs/stylex';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  nameCell: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
  },
});

type SettingsConnectedAccountsTableRowProps = {
  account: ConnectedAccount;
};

export const SettingsConnectedAccountsTableRow = ({
  account,
}: SettingsConnectedAccountsTableRowProps) => {
  const theme = useTheme();
  const IconComponent = SettingsConnectedAccountIcon({ account });

  return (
    <TableRow
      key={account.id}
      gridTemplateColumns="minmax(0, 1fr) auto"
      cursor="pointer"
      hoverBackgroundColor={themeCssVariables.background.transparent.light}
    >
      <TableCell>
        <div {...stylex.props(styles.nameCell)}>
          <IconComponent
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
          {account.handle}
        </div>
      </TableCell>
      <TableCell align="right">
        <SettingsAccountsConnectedAccountsRowRightContainer account={account} />
      </TableCell>
    </TableRow>
  );
};
