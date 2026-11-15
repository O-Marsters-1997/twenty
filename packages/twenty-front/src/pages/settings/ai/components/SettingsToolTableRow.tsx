import { type ReactNode } from 'react';

import { AppChip } from '@/applications/components/AppChip';
import { StyledNameTableCell } from '@/settings/data-model/object-details/components/SettingsObjectItemTableRowStyledComponents';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';

export type SettingsToolTableRowProps = {
  leftIcon: ReactNode;
  name: string;
  applicationId: string;
  action?: ReactNode;
  link?: string;
};

export const TOOL_TABLE_ROW_GRID_TEMPLATE_COLUMNS = '1fr 100px 36px';

const styles = stylex.create({
  iconContainer: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
  },
});

export const SettingsToolTableRow = ({
  leftIcon,
  name,
  applicationId,
  action,
  link,
}: SettingsToolTableRowProps) => {
  return (
    <TableRow
      gridTemplateColumns={TOOL_TABLE_ROW_GRID_TEMPLATE_COLUMNS}
      to={link}
    >
      <TableCell
        color={themeCssVariables.font.color.primary}
        gap={themeCssVariables.spacing[2]}
        minWidth="0"
        overflow="hidden"
      >
        <div {...stylex.props(styles.iconContainer)}>{leftIcon}</div>
        <OverflowingTextWithTooltip text={name} />
      </TableCell>
      <StyledNameTableCell minWidth="0" overflow="hidden">
        <AppChip applicationId={applicationId} />
      </StyledNameTableCell>
      <TableCell
        align="right"
        padding={`0 ${themeCssVariables.spacing[2]} 0 0`}
      >
        {action}
      </TableCell>
    </TableRow>
  );
};
