import { type BlocklistItem } from '@/accounts/types/BlocklistItem';
import { SettingsAccountsBlocklistTableRow } from '@/settings/accounts/components/SettingsAccountsBlocklistTableRow';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsAccountsBlocklistTableProps = {
  blocklist: BlocklistItem[];
  handleBlockedEmailRemove: (id: string) => void;
};

const styles = stylex.create({
  tableContainer: {
    marginTop: spacing['--t-spacing-4'],
  },
  tableBodyContainer: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
  },
});

export const SettingsAccountsBlocklistTable = ({
  blocklist,
  handleBlockedEmailRemove,
}: SettingsAccountsBlocklistTableProps) => {
  return (
    <>
      {blocklist.length > 0 && (
        <div {...stylex.props(styles.tableContainer)}>
          <Table>
            <TableRow
              gridAutoColumns="200px 1fr 20px"
              mobileGridAutoColumns="120px 1fr 20px"
            >
              <TableHeader>{t`Email/Domain`}</TableHeader>
              <TableHeader>{t`Added to blocklist`}</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
            <div {...stylex.props(styles.tableBodyContainer)}>
              <TableBody>
                {blocklist.map((blocklistItem) => (
                  <SettingsAccountsBlocklistTableRow
                    key={blocklistItem.id}
                    blocklistItem={blocklistItem}
                    onRemove={handleBlockedEmailRemove}
                  />
                ))}
              </TableBody>
            </div>
          </Table>
        </div>
      )}
    </>
  );
};
