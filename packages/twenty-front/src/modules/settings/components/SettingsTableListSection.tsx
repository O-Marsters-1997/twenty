import { type ComponentType, type ReactNode } from 'react';

import { isDefined } from 'twenty-shared/utils';

import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { Section } from 'twenty-ui/components/layout';
import { IconChevronRight, IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  tableRows: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    paddingTop: spacing['--t-spacing-2'],
  },
});

const HEADER_PADDING = `0 ${themeCssVariables.spacing[2]} 0 ${themeCssVariables.spacing[2]}`;

// an auto track resolves differently in the header and in the rows, so the chevron column is fixed
const CHEVRON_COLUMN_WIDTH = themeCssVariables.spacing[8];

export type SettingsTableListSectionColumn<Item> = {
  label: string;
  align?: 'left' | 'right';
  overflow?: string;
  Cell: ComponentType<{ item: Item }>;
};

type SettingsTableListSectionProps<Item extends { id: string }> = {
  title: string;
  description: string;
  headerAdornment?: ReactNode;
  toolbar?: ReactNode;
  items: Item[];
  columns: SettingsTableListSectionColumn<Item>[];
  gridAutoColumns: string;
  showRowChevron?: boolean;
  onRowClick?: (item: Item) => void;
  footerButtonLabel?: string;
  onFooterButtonClick?: () => void;
};

export const SettingsTableListSection = <
  Item extends { id: string } = { id: string },
>({
  title,
  description,
  headerAdornment,
  toolbar,
  items,
  columns,
  gridAutoColumns,
  showRowChevron = false,
  onRowClick,
  footerButtonLabel,
  onFooterButtonClick,
}: SettingsTableListSectionProps<Item>) => {
  const resolvedGridAutoColumns = showRowChevron
    ? `${gridAutoColumns} ${CHEVRON_COLUMN_WIDTH}`
    : gridAutoColumns;

  return (
    <Section.Root>
      <Section.Header
        title={title}
        description={description}
        actions={headerAdornment}
      />
      {isDefined(toolbar) && toolbar}
      {items.length > 0 && (
        <Table>
          <TableRow gridAutoColumns={resolvedGridAutoColumns}>
            {columns.map((column) => (
              <TableHeader
                key={column.label}
                align={column.align}
                padding={HEADER_PADDING}
              >
                {column.label}
              </TableHeader>
            ))}
            {showRowChevron && <TableHeader padding={HEADER_PADDING} />}
          </TableRow>
          <div {...stylex.props(styles.tableRows)}>
            {items.map((item) => (
              <TableRow
                key={item.id}
                gridAutoColumns={resolvedGridAutoColumns}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.label}
                    align={column.align}
                    overflow={column.overflow}
                  >
                    <column.Cell item={item} />
                  </TableCell>
                ))}
                {showRowChevron && (
                  <TableCell
                    align="right"
                    color={themeCssVariables.font.color.light}
                  >
                    <IconChevronRight size={16} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </div>
        </Table>
      )}
      {isDefined(footerButtonLabel) && isDefined(onFooterButtonClick) && (
        <div {...stylex.props(styles.footer)}>
          <Button
            startIcon={<IconPlus />}
            size="sm"
            onClick={onFooterButtonClick}
            variant="outline"
          >
            {footerButtonLabel}
          </Button>
        </div>
      )}
    </Section.Root>
  );
};
