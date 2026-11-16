import { themeCssVariables } from 'twenty-ui/theme';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/primitives/input';
import { IconDownload } from 'twenty-ui/icon';

import { type DpaAgreement } from '@/settings/legal/types/Dpa';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { beautifyExactDateTime } from '~/utils/date-utils';
import * as stylex from '@stylexjs/stylex';

export const DPA_AGREEMENT_ROW_GRID_COLUMNS = '3fr 2fr 2fr 140px';

const styles = stylex.create({
  ellipsisLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type SettingsDpaAgreementRowProps = {
  agreement: DpaAgreement;
  onDownload: (agreement: DpaAgreement) => void;
};

export const SettingsDpaAgreementRow = ({
  agreement,
  onDownload,
}: SettingsDpaAgreementRowProps) => {
  const { t } = useLingui();

  const label =
    agreement.type === 'SIGNED'
      ? (agreement.customerLegalEntityName ?? t`Signed copy`)
      : t`Click-through acceptance`;

  return (
    <TableRow gridAutoColumns={DPA_AGREEMENT_ROW_GRID_COLUMNS}>
      <TableCell
        color={themeCssVariables.font.color.primary}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        <div {...stylex.props(styles.ellipsisLabel)}>{label}</div>
      </TableCell>
      <TableCell>{agreement.templateVersion}</TableCell>
      <TableCell>{beautifyExactDateTime(agreement.acceptedAt)}</TableCell>
      <TableCell align="right">
        {agreement.downloadUrl ? (
          <Button
            startIcon={<IconDownload />}
            size="sm"
            onClick={() => onDownload(agreement)}
            variant="ghost"
          >{t`Download`}</Button>
        ) : (
          '—'
        )}
      </TableCell>
    </TableRow>
  );
};
