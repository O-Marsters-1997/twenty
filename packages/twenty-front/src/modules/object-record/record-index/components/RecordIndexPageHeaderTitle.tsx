import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  titleWithSelectedRecords: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'row',
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    paddingRight: spacing['--t-spacing-0_5'],
  },
  selectedRecordsCount: {
    color: fontColor['--t-font-color-tertiary'],
    paddingLeft: spacing['--t-spacing-0_5'],
  },
});

type RecordIndexPageHeaderTitleProps = {
  label: string;
  numberOfSelectedRecords: number;
};

export const RecordIndexPageHeaderTitle = ({
  label,
  numberOfSelectedRecords,
}: RecordIndexPageHeaderTitleProps) => {
  const { formatNumber } = useNumberFormat();

  if (numberOfSelectedRecords === 0) {
    return <>{label}</>;
  }

  return (
    <div {...stylex.props(styles.titleWithSelectedRecords)}>
      <div {...stylex.props(styles.title)}>{label}</div>
      <>{'->'}</>
      <div {...stylex.props(styles.selectedRecordsCount)}>
        {t`${formatNumber(numberOfSelectedRecords)} selected`}
      </div>
    </div>
  );
};
