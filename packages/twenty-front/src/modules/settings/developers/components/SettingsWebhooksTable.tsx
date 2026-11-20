import { SettingsDevelopersWebhookTableRow } from '@/settings/developers/components/SettingsDevelopersWebhookTableRow';
import { WEBHOOK_TABLE_ROW_GRID_TEMPLATE_COLUMNS } from '@/settings/developers/constants/WebhookTableRowGridTemplateColumns';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { useQuery } from '@apollo/client/react';
import { GetWebhooksDocument } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  tableBodyContainer: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    maxHeight: '260px',
    overflowY: 'auto',
  },
});

export const SettingsWebhooksTable = () => {
  const { data: webhooksData } = useQuery(GetWebhooksDocument);

  const webhooks = webhooksData?.webhooks;

  return (
    <Table>
      <TableRow gridTemplateColumns={WEBHOOK_TABLE_ROW_GRID_TEMPLATE_COLUMNS}>
        <TableHeader>URL</TableHeader>
        <TableHeader></TableHeader>
      </TableRow>
      {!!webhooks?.length && (
        <div {...stylex.props(styles.tableBodyContainer)}>
          <TableBody>
            {webhooks.map((webhookFieldItem) => (
              <SettingsDevelopersWebhookTableRow
                key={webhookFieldItem.id}
                webhook={webhookFieldItem}
                to={getSettingsPath(SettingsPath.WebhookDetail, {
                  webhookId: webhookFieldItem.id,
                })}
              />
            ))}
          </TableBody>
        </div>
      )}
    </Table>
  );
};
