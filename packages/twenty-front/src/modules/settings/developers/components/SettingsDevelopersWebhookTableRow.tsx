
import { WEBHOOK_TABLE_ROW_GRID_TEMPLATE_COLUMNS } from '@/settings/developers/constants/WebhookTableRowGridTemplateColumns';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { getUrlHostnameOrThrow, isValidUrl } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconChevronRight } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import { type Webhook } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { font } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  iconChevronRightContainer: {
    alignItems: 'center',
    color: font['--t-font-color-tertiary'],
    display: 'flex',
  },
});

export const SettingsDevelopersWebhookTableRow = ({
  webhook,
  to,
}: {
  webhook: Pick<
    Webhook,
    'id' | 'targetUrl' | 'operations' | 'description' | 'secret'
  >;
  to: string;
}) => {
  const theme = useTheme();
  return (
    <TableRow
      gridTemplateColumns={WEBHOOK_TABLE_ROW_GRID_TEMPLATE_COLUMNS}
      to={to}
    >
      <TableCell color={themeCssVariables.font.color.primary} overflow="hidden">
        <OverflowingTextWithTooltip
          text={
            isValidUrl(webhook.targetUrl)
              ? getUrlHostnameOrThrow(webhook.targetUrl)
              : webhook.targetUrl
          }
        />
      </TableCell>
      <TableCell
        align="center"
        padding={`0 ${themeCssVariables.spacing[1]} 0 0`}
      >
        <span {...stylex.props(styles.iconChevronRightContainer)}>
          <IconChevronRight
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
        </span>
      </TableCell>
    </TableRow>
  );
};
