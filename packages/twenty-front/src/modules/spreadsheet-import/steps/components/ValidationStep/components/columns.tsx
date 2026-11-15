import { t } from '@lingui/core/macro';
import { type Column, useRowSelection } from 'react-data-grid';

import {
  type ImportedStructuredRow,
  type SpreadsheetImportFields,
} from '@/spreadsheet-import/types';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';

import camelCase from 'lodash.camelcase';
import { isDefined } from 'twenty-shared/utils';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { Checkbox, Switch } from 'twenty-ui/primitives/input';
import { type ImportedStructuredRowMetadata } from '@/spreadsheet-import/steps/components/ValidationStep/types';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const SELECT_COLUMN_KEY = 'select-row';

const formatSafeId = (columnKey: string) => {
  return camelCase(columnKey.replace('(', '').replace(')', ''));
};

export const generateColumns = (
  fields: SpreadsheetImportFields,
): Column<ImportedStructuredRow & ImportedStructuredRowMetadata>[] => [
  {
    key: SELECT_COLUMN_KEY,
    name: '',
    width: 35,
    minWidth: 35,
    maxWidth: 35,
    resizable: false,
    sortable: false,
    frozen: true,
    renderCell: (props: any) => {
      // oxlint-disable-next-line  react-hooks/rules-of-hooks
      const { isRowSelected, onRowSelectionChange } = useRowSelection();

      return (
        <div {...stylex.props(styles.checkboxContainer)}>
          <Checkbox
            aria-label={t`Select`}
            checked={isRowSelected}
            variant={'soft'}
            onCheckedChange={(isChecked, eventDetails) => {
              onRowSelectionChange({
                row: props.row,
                checked: isChecked,
                isShiftClick:
                  'shiftKey' in eventDetails.event &&
                  eventDetails.event.shiftKey === true,
              });
            }}
          />
        </div>
      );
    },
  },
  ...fields.map(
    (
      column,
    ): Column<ImportedStructuredRow & ImportedStructuredRowMetadata> => ({
      key: column.key,
      name: column.label,
      minWidth: 150,
      resizable: true,
      renderHeaderCell: () => (
        <div {...stylex.props(styles.headerContainer)}>
          <Tooltip
            side="top"
            content={column.description}
            delay={TooltipDelay.mediumDelay}
            disabled={!column.description}
          >
            <span id={formatSafeId(column.key)} {...stylex.props(styles.headerLabel)}>
              {column.label}
            </span>
          </Tooltip>
          <></>
        </div>
      ),
      editable: column.fieldType.type !== 'checkbox',
      // Todo: remove usage of react-data-grid
      renderEditCell: ({ row, onRowChange, onClose }: any) => {
        const columnKey = column.key as keyof (ImportedStructuredRow &
          ImportedStructuredRowMetadata);
        let component;

        switch (column.fieldType.type) {
          case 'select': {
            component = (
              <div {...stylex.props(styles.selectReadonlyValueContianer)}>
                {row[columnKey]}
              </div>
            );
            break;
          }
          default:
            component = (
              <SettingsTextInput
                instanceId={`validation-${column.key}-${row.__index}`}
                value={row[columnKey] as string}
                onChange={(value: string) => {
                  onRowChange({ ...row, [columnKey]: value });
                }}
                autoFocus={true}
                onBlur={() => onClose(true)}
              />
            );
        }

        return <div {...stylex.props(styles.inputContainer)}>{component}</div>;
      },
      // Todo: remove usage of react-data-grid
      renderCell: ({ row, onRowChange }: { row: any; onRowChange: any }) => {
        const columnKey = column.key as keyof (ImportedStructuredRow &
          ImportedStructuredRowMetadata);
        let component;

        switch (column.fieldType.type) {
          case 'checkbox':
            component = (
              <div
                id={formatSafeId(`${columnKey}-${row.__index}`)}
                onClick={(event) => {
                  event.stopPropagation();
                }} {...stylex.props(styles.switchContainer)}
              >
                <Switch
                  aria-label={column.label}
                  checked={row[columnKey] as boolean}
                  onCheckedChange={() => {
                    onRowChange({
                      ...row,
                      [columnKey]: !row[columnKey],
                    });
                  }}
                />
              </div>
            );
            break;
          case 'select':
            component = (
              <div
                id={formatSafeId(`${columnKey}-${row.__index}`)} {...stylex.props(styles.defaultContainer)}
              >
                {column.fieldType.options.find(
                  (option) => option.value === row[columnKey],
                )?.label || null}
              </div>
            );
            break;
          default:
            component = (
              <div
                id={formatSafeId(`${columnKey}-${row.__index}`)} {...stylex.props(styles.defaultContainer)}
              >
                {row[columnKey]}
              </div>
            );
        }

        if (isDefined(row.__errors?.[columnKey])) {
          return (
            <Tooltip
              content={row.__errors?.[columnKey]?.message}
              side="top"
              delay={TooltipDelay.shortDelay}
            >
              {component}
            </Tooltip>
          );
        }

        return component;
      },
      cellClass: (row: ImportedStructuredRowMetadata) => {
        switch (row.__errors?.[column.key]?.level) {
          case 'error':
            return 'rdg-cell-error';
          case 'warning':
            return 'rdg-cell-warning';
          case 'info':
            return 'rdg-cell-info';
          default:
            return '';
        }
      },
    }),
  ),
];

const styles = stylex.create({
  headerContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    position: 'relative',
  },
  headerLabel: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  checkboxContainer: {
    alignItems: 'center',
    boxSizing: 'content-box',
    display: 'flex',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    lineHeight: '0',
    width: '100%',
  },
  switchContainer: {
    alignItems: 'center',
    display: 'flex',
    height: '100%',
  },
  inputContainer: {
    alignItems: 'center',
    display: 'flex',
    minHeight: '100%',
    minWidth: '100%',
    paddingRight: spacing['--t-spacing-2'],
  },
  defaultContainer: {
    alignContent: 'center',
    minHeight: '100%',
    minWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  selectReadonlyValueContianer: {
    paddingLeft: spacing['--t-spacing-2'],
  },
});
