import { SortableTableHeader } from '@/ui/layout/table/components/SortableTableHeader';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useSortedArray } from '@/ui/layout/table/hooks/useSortedArray';
import { type TableMetadata } from '@/ui/layout/table/types/TableMetadata';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconSquareKey, IconTrash } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import { type SettingsObjectIndexesTableItem } from '@/settings/data-model/types/SettingsObjectIndexesTableItem';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const OBJECT_INDEX_TABLE_GRID_TEMPLATE_COLUMNS = '1fr 70px 80px 32px';

const styles = stylex.create({
  tableContainer: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    marginTop: spacing['--t-spacing-3'],
  },
  empty: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-md'],
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    textAlign: 'center',
  },
});

const TABLE_FIELDS: TableMetadata<SettingsObjectIndexesTableItem>['fields'] = [
  {
    fieldLabel: msg`Fields`,
    fieldName: 'indexFields',
    fieldType: 'string',
    align: 'left',
  },
  {
    fieldLabel: msg`Unique`,
    FieldIcon: IconSquareKey,
    fieldName: 'isUnique',
    fieldType: 'string',
    align: 'left',
  },
  {
    fieldLabel: msg`Type`,
    fieldName: 'indexType',
    fieldType: 'string',
    align: 'right',
  },
];

const TABLE_METADATA: TableMetadata<SettingsObjectIndexesTableItem> = {
  tableId: 'settingsObjectIndexes',
  fields: TABLE_FIELDS,
  initialSort: {
    fieldName: 'indexFields',
    direction: 'asc',
  },
};

export type SettingsObjectIndexTableProps = {
  items: SettingsObjectIndexesTableItem[];
  isReadOnly: boolean;
  onDeleteIndex: (item: SettingsObjectIndexesTableItem) => void;
};

export const SettingsObjectIndexTable = ({
  items,
  isReadOnly,
  onDeleteIndex,
}: SettingsObjectIndexTableProps) => {
  const { t } = useLingui();
  const sortedItems = useSortedArray(items, TABLE_METADATA);

  return (
    <div {...stylex.props(styles.tableContainer)}>
      <Table>
        <TableRow
          gridTemplateColumns={OBJECT_INDEX_TABLE_GRID_TEMPLATE_COLUMNS}
        >
          {TABLE_METADATA.fields.map((tableField) => (
            <SortableTableHeader
              key={tableField.fieldName}
              fieldName={tableField.fieldName}
              label={t(tableField.fieldLabel)}
              Icon={tableField.FieldIcon}
              tableId={TABLE_METADATA.tableId}
              initialSort={TABLE_METADATA.initialSort}
            />
          ))}
          <TableHeader></TableHeader>
        </TableRow>
        <TableBody>
          {sortedItems.length === 0 ? (
            <div
              {...stylex.props(styles.empty)}
            >{t`No indexes match your filters.`}</div>
          ) : (
            sortedItems.map((item) => (
              <TableRow
                gridTemplateColumns={OBJECT_INDEX_TABLE_GRID_TEMPLATE_COLUMNS}
                key={item.id}
              >
                <TableCell color={themeCssVariables.font.color.primary}>
                  {item.indexFields}
                </TableCell>
                <TableCell>
                  {item.isUnique ? <IconSquareKey size={14} /> : ''}
                </TableCell>
                <TableCell>{item.indexType}</TableCell>
                <TableCell
                  align="right"
                  padding={`0 0 0 ${themeCssVariables.spacing[2]}`}
                >
                  {item.isCustom && !isReadOnly && (
                    <LightIconButton
                      emphasis="subtle"
                      onClick={() => onDeleteIndex(item)}
                      aria-label={t`Delete index`}
                    >
                      <IconTrash />
                    </LightIconButton>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
