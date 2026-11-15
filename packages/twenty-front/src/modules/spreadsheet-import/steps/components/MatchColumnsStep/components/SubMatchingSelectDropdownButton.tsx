import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { SubMatchingSelectControlContainer } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/SubMatchingSelectControlContainer';
import {
  type SpreadsheetMatchedSelectColumn,
  type SpreadsheetMatchedSelectOptionsColumn,
} from '@/spreadsheet-import/types/SpreadsheetColumn';

import { type SpreadsheetMatchedOptions } from '@/spreadsheet-import/types/SpreadsheetMatchedOptions';
import { getFieldOptions } from '@/spreadsheet-import/utils/getFieldOptions';
import { useTheme } from 'twenty-ui/theme';
import { Tag, type TagColor } from 'twenty-ui/primitives/data-display';
import { IconChevronDown } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

type SubMatchingSelectDropdownButtonProps = {
  option: SpreadsheetMatchedOptions | Partial<SpreadsheetMatchedOptions>;
  column:
    | SpreadsheetMatchedSelectColumn
    | SpreadsheetMatchedSelectOptionsColumn;
  placeholder: string;
};

export const SubMatchingSelectDropdownButton = ({
  option,
  column,
  placeholder,
}: SubMatchingSelectDropdownButtonProps) => {
  const theme = useTheme();
  const { spreadsheetImportFields: fields } = useSpreadsheetImportInternal();
  const options = getFieldOptions(fields, column.value);
  const value = options.find(
    (fieldOption) => fieldOption.value === option.value,
  );
  return (
    <SubMatchingSelectControlContainer cursor="pointer">
      <Tag color={value?.color as TagColor}>{value?.label ?? placeholder}</Tag>
      <div {...stylex.props(styles.iconChevronDownContainer)}>
        <IconChevronDown size={theme.icon.size.md} />
      </div>
    </SubMatchingSelectControlContainer>
  );
};

const styles = stylex.create({
  iconChevronDownContainer: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
  },
});
