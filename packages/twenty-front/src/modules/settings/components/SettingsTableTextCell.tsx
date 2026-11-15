import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';

import { TableCell } from '@/ui/layout/table/components/TableCell';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  startElement: {
    display: 'flex',
    flexShrink: '0',
  },
});

type SettingsTableTextCellProps = {
  text?: string | null;
  startElement?: ReactNode;
  align?: 'left' | 'right';
};

export const SettingsTableTextCell = ({
  text,
  startElement,
  align,
}: SettingsTableTextCellProps) => (
  <TableCell
    align={align}
    gap={themeCssVariables.spacing[1]}
    overflow="hidden"
    whiteSpace="nowrap"
  >
    {isDefined(startElement) && (
      <span {...stylex.props(styles.startElement)}>{startElement}</span>
    )}
    <OverflowingTextWithTooltip text={text} />
  </TableCell>
);
