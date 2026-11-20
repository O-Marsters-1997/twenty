import {
  formatExpiration,
  isExpired,
} from '@/settings/developers/utils/formatExpiration';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useLingui } from '@lingui/react/macro';
import { IconChevronRight } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { type ApiKey } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  ellipsisLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type ApiKeyType = Pick<ApiKey, 'id' | 'name' | 'expiresAt' | 'revokedAt'> & {
  role?: { id: string; label: string; icon?: string | null } | null;
};

type SettingsApiKeysFieldItemTableRowProps = {
  apiKey: ApiKeyType;
  to: string;
};

export const SettingsApiKeysFieldItemTableRow = ({
  apiKey,
  to,
}: SettingsApiKeysFieldItemTableRowProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const formattedExpiration = formatExpiration(apiKey.expiresAt || null);

  const gridColumns = '5fr 2fr 3fr 1fr';

  return (
    <TableRow gridAutoColumns={gridColumns} to={to}>
      <TableCell
        color={theme.font.color.primary}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        clickable
      >
        <div {...stylex.props(styles.ellipsisLabel)}>
          {apiKey.name || t`Unnamed API Key`}
        </div>
      </TableCell>

      <TableCell
        color={theme.font.color.tertiary}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        clickable
      >
        <div {...stylex.props(styles.ellipsisLabel)}>
          {apiKey.role?.label || '-'}
        </div>
      </TableCell>

      <TableCell
        color={
          isExpired(apiKey.expiresAt || null)
            ? theme.font.color.danger
            : theme.font.color.tertiary
        }
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        clickable
      >
        <div {...stylex.props(styles.ellipsisLabel)}>{formattedExpiration}</div>
      </TableCell>

      <TableCell align="right">
        <IconChevronRight
          size={theme.icon.size.md}
          color={theme.font.color.tertiary}
        />
      </TableCell>
    </TableRow>
  );
};
