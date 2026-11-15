import { SubMatchingSelectControlContainer } from '@/spreadsheet-import/steps/components/MatchColumnsStep/components/SubMatchingSelectControlContainer';

import { type SpreadsheetMatchedOptions } from '@/spreadsheet-import/types/SpreadsheetMatchedOptions';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  label: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  controlLabel: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
});

export type SubMatchingSelectRowLeftSelectProps = {
  option: SpreadsheetMatchedOptions | Partial<SpreadsheetMatchedOptions>;
};

export const SubMatchingSelectRowLeftSelect = ({
  option,
}: SubMatchingSelectRowLeftSelectProps) => {
  return (
    <SubMatchingSelectControlContainer cursor="default">
      <div {...stylex.props(styles.controlLabel)}>
        <span {...stylex.props(styles.label)}>{option.entry}</span>
      </div>
    </SubMatchingSelectControlContainer>
  );
};
