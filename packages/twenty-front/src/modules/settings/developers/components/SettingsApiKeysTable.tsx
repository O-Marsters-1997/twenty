import { SettingsApiKeysFieldItemTableRow } from '@/settings/developers/components/SettingsApiKeysFieldItemTableRow';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { Trans } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { useQuery } from '@apollo/client/react';
import { GetApiKeysDocument } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  tableBodyContainer: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
});

export const SettingsApiKeysTable = () => {
  const { data: apiKeysData } = useQuery(GetApiKeysDocument);

  const apiKeys = apiKeysData?.apiKeys;

  const gridAutoColumns = '5fr 2fr 3fr 1fr';

  return (
    <Table>
      <TableRow gridAutoColumns={gridAutoColumns}>
        <TableHeader>
          <Trans>Name</Trans>
        </TableHeader>
        <TableHeader>
          <Trans>Role</Trans>
        </TableHeader>
        <TableHeader>
          <Trans>Expiration</Trans>
        </TableHeader>
        <TableHeader></TableHeader>
      </TableRow>
      {!!apiKeys?.length && (
        <div {...stylex.props(styles.tableBodyContainer)}>
          <TableBody>
            {apiKeys.map((apiKey) => (
              <SettingsApiKeysFieldItemTableRow
                key={apiKey.id}
                apiKey={apiKey}
                to={getSettingsPath(SettingsPath.ApiKeyDetail, {
                  apiKeyId: apiKey.id,
                })}
              />
            ))}
          </TableBody>
        </div>
      )}
    </Table>
  );
};
