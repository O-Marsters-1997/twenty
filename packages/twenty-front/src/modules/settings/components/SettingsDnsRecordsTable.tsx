import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import * as stylex from '@stylexjs/stylex';
import { copyableCellMarker } from './SettingsDnsRecordsTable.stylex';
import { t } from '@lingui/core/macro';
import { capitalize, isDefined } from 'twenty-shared/utils';
import { Status } from 'twenty-ui/primitives/data-display';
import { type ThemeColor } from 'twenty-ui/theme';
import {
  animationDuration,
  backgroundTransparent,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';

type DnsRecord = {
  type: string;
  key: string;
  value: string;
  priority?: number | null;
  ttl?: string;
  status?: string;
  statusColor?: ThemeColor;
};

type SettingsDnsRecordsTableProps = {
  records: DnsRecord[];
};


const styles = stylex.create({
  recordRow: {
    marginTop: spacing['--t-spacing-2'],
  },
  copyableCell: {
    minWidth: 0,
    width: '100%',
  },
  input: {
    backgroundColor: {
      default: null,
      [stylex.when.ancestor(':hover', copyableCellMarker)]:
        backgroundTransparent['--t-background-transparent-light'],
    },
    borderColor: {
      default: null,
      [stylex.when.ancestor(':hover', copyableCellMarker)]:
        borderColor['--t-border-color-strong'],
    },
    cursor: 'pointer',
    pointerEvents: 'none',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: 'ease',
  },
});

type CopyableCellProps = {
  instanceId: string;
  value: string;
  onCopy: () => void;
};

const CopyableCell = ({ instanceId, value, onCopy }: CopyableCellProps) => (
  <div
    {...stylex.props(styles.copyableCell, copyableCellMarker)}
    onClick={onCopy}
  >
    <SettingsTextInput
      instanceId={instanceId}
      value={value}
      sizeVariant="sm"
      disabled
      fullWidth
      inputProps={stylex.props(styles.input)}
    />
  </div>
);

export const SettingsDnsRecordsTable = ({
  records,
}: SettingsDnsRecordsTableProps) => {
  const { copyToClipboard } = useCopyToClipboard();

  if (records.length === 0) {
    return null;
  }

  const hasPriorityColumn = records.some((record) =>
    isDefined(record.priority),
  );
  const hasTtlColumn = records.some((record) => isDefined(record.ttl));
  const hasStatusColumn = records.some((record) => isDefined(record.status));

  const gridAutoColumns = [
    '100px',
    'minmax(0, 1fr)',
    'minmax(0, 1.5fr)',
    ...(hasPriorityColumn ? ['80px'] : []),
    ...(hasTtlColumn ? ['80px'] : []),
    ...(hasStatusColumn ? ['112px'] : []),
  ].join(' ');

  return (
    <Table>
      <TableRow gridAutoColumns={gridAutoColumns}>
        <TableHeader>{t`Type`}</TableHeader>
        <TableHeader>{t`Name`}</TableHeader>
        <TableHeader>{t`Value`}</TableHeader>
        {hasPriorityColumn && (
          <TableHeader align="center">{t`Priority`}</TableHeader>
        )}
        {hasTtlColumn && <TableHeader align="center">{t`TTL`}</TableHeader>}
        {hasStatusColumn && (
          <TableHeader align="right">{t`Status`}</TableHeader>
        )}
      </TableRow>

      {records.map((record, index) => (
        <TableRow
          key={`${index}-${record.type}-${record.key}`}
          gridAutoColumns={gridAutoColumns}
          {...stylex.props(styles.recordRow)}
        >
          <TableCell>
            <CopyableCell
              instanceId={`dns-record-type-${index}`}
              value={record.type}
              onCopy={() =>
                copyToClipboard(record.type, t`Copied to clipboard`)
              }
            />
          </TableCell>
          <TableCell>
            <CopyableCell
              instanceId={`dns-record-name-${index}`}
              value={record.key}
              onCopy={() => copyToClipboard(record.key, t`Copied to clipboard`)}
            />
          </TableCell>
          <TableCell>
            <CopyableCell
              instanceId={`dns-record-value-${index}`}
              value={record.value}
              onCopy={() =>
                copyToClipboard(record.value, t`Copied to clipboard`)
              }
            />
          </TableCell>
          {hasPriorityColumn && (
            <TableCell align="center">{record.priority}</TableCell>
          )}
          {hasTtlColumn && <TableCell align="center">{record.ttl}</TableCell>}
          {hasStatusColumn && (
            <TableCell align="right">
              {isDefined(record.status) && isDefined(record.statusColor) && (
                <Status color={record.statusColor}>
                  {capitalize(record.status)}
                </Status>
              )}
            </TableCell>
          )}
        </TableRow>
      ))}
    </Table>
  );
};
