import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';

import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableRow } from '@/ui/layout/table/components/TableRow';

const styles = stylex.create({
  body: {
    padding: 0,
    gap: 0,
  },
  row: {
    borderRadius: 0,
  },
  rowDivider: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
});

type CoreObjectTableBodyProps = ComponentProps<typeof TableBody>;

export const CoreObjectTableBody = (props: CoreObjectTableBodyProps) => (
  <TableBody {...props} {...stylex.props(styles.body)} />
);

type CoreObjectTableRowProps = ComponentProps<typeof TableRow> & {
  isLast?: boolean;
};

export const CoreObjectTableRow = ({
  isLast = false,
  ...props
}: CoreObjectTableRowProps) => (
  <TableRow
    {...props}
    {...stylex.props(styles.row, !isLast && styles.rowDivider)}
  />
);
