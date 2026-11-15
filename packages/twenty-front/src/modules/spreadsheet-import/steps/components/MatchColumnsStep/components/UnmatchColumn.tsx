import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { SubMatchingSelectRow } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/SubMatchingSelectRow';
import { UnmatchColumnBanner } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/UnmatchColumnBanner';
import { type SpreadsheetImportFields } from '@/spreadsheet-import/types';
import { type SpreadsheetColumn } from '@/spreadsheet-import/types/SpreadsheetColumn';
import { type SpreadsheetColumns } from '@/spreadsheet-import/types/SpreadsheetColumns';
import { SpreadsheetColumnType } from '@/spreadsheet-import/types/SpreadsheetColumnType';
import { t } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Collapsible } from 'twenty-ui/primitives/layout';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const getExpandableContainerTitle = (
  fields: SpreadsheetImportFields,
  column: SpreadsheetColumn,
): string => {
  const fieldLabel = fields.find(
    (field) => 'value' in column && field.key === column.value,
  )?.label;

  const unmatchedCount =
    'matchedOptions' in column
      ? column.matchedOptions.filter((option) => !isDefined(option.value))
          .length
      : 0;

  return t`Match ${fieldLabel ?? ''} (${unmatchedCount} Unmatched)`;
};

type UnmatchColumnProps = {
  columns: SpreadsheetColumns;
  columnIndex: number;
  onSubChange: (val: string, index: number, option: string) => void;
};

const styles = stylex.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
    marginTop: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
  },
});

export const UnmatchColumn = ({
  columns,
  columnIndex,
  onSubChange,
}: UnmatchColumnProps) => {
  const { spreadsheetImportFields: fields } = useSpreadsheetImportInternal();
  const [isExpanded, setIsExpanded] = useState(false);
  const column = columns[columnIndex];
  const isSelect = 'matchedOptions' in column;
  const { t } = useLingui();

  const allMatched = column.type === SpreadsheetColumnType.matchedSelectOptions;

  if (!isSelect) return null;

  return (
    <div {...stylex.props(styles.container)}>
      <UnmatchColumnBanner
        message={getExpandableContainerTitle(fields, column)}
        buttonOnClick={() => setIsExpanded(!isExpanded)}
        isExpanded={isExpanded}
        allMatched={allMatched}
      />
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Panel dimension="height" containAnimation>
          <div {...stylex.props(styles.contentWrapper)}>
            {column.matchedOptions?.map((option) => (
              <SubMatchingSelectRow
                option={option}
                column={column}
                onSubChange={onSubChange}
                key={option.entry}
                placeholder={t`Select an option`}
              />
            ))}
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
};
