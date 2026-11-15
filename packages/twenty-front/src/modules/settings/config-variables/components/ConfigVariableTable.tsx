import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { t } from '@lingui/core/macro';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconChevronRight } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { border } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  tableBodyContainer: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: border['--t-border-color-light'],
  },
});

const GRID_AUTO_COLUMNS = '5fr 3fr 3fr 1fr';

type ConfigVariable = {
  name: string;
  description?: string;
  value?: string | React.ReactNode;
  to: string;
};

type ConfigVariableTableProps = { configVariables: ConfigVariable[] };

export const ConfigVariableTable = ({
  configVariables,
}: ConfigVariableTableProps) => {
  const theme = useTheme();

  return (
    <Table>
      <TableRow gridAutoColumns={GRID_AUTO_COLUMNS}>
        <TableHeader>{t`Name`}</TableHeader>
        <TableHeader align="right">{t`Description`}</TableHeader>
        <TableHeader align="right">{t`Value`}</TableHeader>
        <TableHeader align="right"></TableHeader>
      </TableRow>
      <div {...stylex.props(styles.tableBodyContainer)}>
        <TableBody>
          {configVariables.map((variable, index) => (
            <TableRow
              key={index}
              gridAutoColumns={GRID_AUTO_COLUMNS}
              to={variable.to}
            >
              <TableCell
                color={theme.font.color.primary}
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                clickable
              >
                <OverflowingTextWithTooltip text={variable.name} />
              </TableCell>
              <TableCell
                color={theme.font.color.secondary}
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                clickable
              >
                <OverflowingTextWithTooltip text={variable.description} />
              </TableCell>
              <TableCell
                color={theme.font.color.secondary}
                align="right"
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                clickable
              >
                {typeof variable.value === 'string' ? (
                  <OverflowingTextWithTooltip text={variable.value} />
                ) : (
                  variable.value
                )}
              </TableCell>
              <TableCell align="right" color={theme.font.color.secondary}>
                <IconChevronRight
                  size={theme.icon.size.md}
                  color={theme.font.color.tertiary}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </div>
    </Table>
  );
};
