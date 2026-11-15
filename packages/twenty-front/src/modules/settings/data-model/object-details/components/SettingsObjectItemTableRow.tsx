import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';

import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isHiddenSystemField } from '@/object-metadata/utils/isHiddenSystemField';
import { SettingsItemTypeTag } from '@/settings/components/SettingsItemTypeTag';
import { SettingsNameCellSecondaryLabel } from '@/settings/components/SettingsNameCellSecondaryLabel';
import {
  SETTINGS_OBJECT_TABLE_ROW_GRID_TEMPLATE_COLUMNS,
  StyledActionTableCell,
  StyledNameTableCell,
  StyledStickyFirstCell,
} from '@/settings/data-model/object-details/components/SettingsObjectItemTableRowStyledComponents';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

export type SettingsObjectMetadataItemTableRowProps = {
  action: ReactNode;
  objectMetadataItem: EnrichedObjectMetadataItem;
  link?: string;
  totalObjectCount: number;
};

const styles = stylex.create({
  nameContainer: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
  },
  nameLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export const SettingsObjectMetadataItemTableRow = ({
  action,
  objectMetadataItem,
  link,
  totalObjectCount,
}: SettingsObjectMetadataItemTableRowProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const { formatNumber } = useNumberFormat();

  return (
    <TableRow
      gridTemplateColumns={SETTINGS_OBJECT_TABLE_ROW_GRID_TEMPLATE_COLUMNS}
      key={objectMetadataItem.namePlural}
      to={link}
    >
      <StyledStickyFirstCell>
        <StyledNameTableCell>
          <ObjectMetadataIcon
            objectMetadataItem={objectMetadataItem}
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
          <div {...stylex.props(styles.nameContainer)}>
            <div
              title={objectMetadataItem.labelPlural}
              {...stylex.props(styles.nameLabel)}
            >
              {objectMetadataItem.labelPlural}
            </div>
            {!objectMetadataItem.isActive && (
              <SettingsNameCellSecondaryLabel>
                {t`Deactivated`}
              </SettingsNameCellSecondaryLabel>
            )}
          </div>
        </StyledNameTableCell>
      </StyledStickyFirstCell>
      <TableCell>
        <SettingsItemTypeTag item={objectMetadataItem} />
      </TableCell>
      <TableCell align="right">
        {formatNumber(
          objectMetadataItem.fields.filter(
            (field) => !isHiddenSystemField(field),
          ).length,
        )}
      </TableCell>
      <TableCell align="right">{formatNumber(totalObjectCount)}</TableCell>
      <StyledActionTableCell>{action}</StyledActionTableCell>
    </TableRow>
  );
};
