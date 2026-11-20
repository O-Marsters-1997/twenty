import { TableCell } from '@/ui/layout/table/components/TableCell';
import * as stylex from '@stylexjs/stylex';
import { themeCssVariables } from 'twenty-ui/theme';
import { media } from 'twenty-ui/theme/constants.stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';
import React, { type ReactNode } from 'react';

export const SETTINGS_OBJECT_TABLE_COLUMN_WIDTH = '98.7px';

export const SETTINGS_OBJECT_TABLE_ROW_GRID_TEMPLATE_COLUMNS = `minmax(180px, 1fr) 140px 80px 100px 36px`;

export const SETTINGS_OBJECT_TABLE_ROW_MOBILE_MIN_WIDTH = '520px';

export const StyledStickyFirstCell = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.stickyFirstCell)}>{children}</div>;

const styles = stylex.create({
  stickyFirstCell: {
    backgroundColor: {
      default: null,
      [media.mobile]: background['--t-background-primary'],
    },
    position: { default: null, [media.mobile]: 'sticky' },
    zIndex: { default: null, [media.mobile]: 1 },
    left: { default: null, [media.mobile]: 0 },
  },
});

export const StyledNameTableCell = (
  props: React.ComponentProps<typeof TableCell>,
) => (
  <TableCell
    color={themeCssVariables.font.color.primary}
    gap={themeCssVariables.spacing[2]}
    // oxlint-disable-next-line react/jsx-props-no-spreading
    {...props}
  />
);

export const StyledActionTableCell = (
  props: React.ComponentProps<typeof TableCell>,
) => (
  <TableCell
    align="center"
    padding={`0 ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[2]}`}
    // oxlint-disable-next-line react/jsx-props-no-spreading
    {...props}
  />
);
