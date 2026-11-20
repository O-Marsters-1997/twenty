import { SubMatchingSelectRowLeftSelect } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/SubMatchingSelectRowLeftSelect';
import { SubMatchingSelectRowRightDropdown } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/SubMatchingSelectRowRightDropdown';
import {
  type SpreadsheetMatchedSelectColumn,
  type SpreadsheetMatchedSelectOptionsColumn,
} from '@/spreadsheet-import/types/SpreadsheetColumn';
import { type SpreadsheetMatchedOptions } from '@/spreadsheet-import/types/SpreadsheetMatchedOptions';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

interface SubMatchingSelectRowProps {
  option: SpreadsheetMatchedOptions | Partial<SpreadsheetMatchedOptions>;
  column:
    | SpreadsheetMatchedSelectColumn
    | SpreadsheetMatchedSelectOptionsColumn;
  onSubChange: (val: string, index: number, option: string) => void;
  placeholder: string;
  selectedOption?:
    | SpreadsheetMatchedOptions
    | Partial<SpreadsheetMatchedOptions>;
}
export const SubMatchingSelectRow = ({
  option,
  column,
  onSubChange,
  placeholder,
}: SubMatchingSelectRowProps) => {
  return (
    <div {...stylex.props(styles.rowContainer)}>
      <SubMatchingSelectRowLeftSelect option={option} />
      <SubMatchingSelectRowRightDropdown
        column={column}
        onSubChange={onSubChange}
        option={option}
        placeholder={placeholder}
      />
    </div>
  );
};

const styles = stylex.create({
  rowContainer: {
    gap: spacing['--t-spacing-4'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: spacing['--t-spacing-1'],
  },
});
