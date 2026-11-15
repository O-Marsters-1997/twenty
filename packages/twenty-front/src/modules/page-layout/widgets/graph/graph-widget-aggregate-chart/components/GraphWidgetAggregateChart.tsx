import { formatNumberChartTrend } from '@/page-layout/widgets/graph/graph-widget-aggregate-chart/utils/formatNumberChartTrend';
import { isDefined } from 'twenty-shared/utils';
import { IconTrendingDown, IconTrendingUp } from 'twenty-ui/icon';
import { Heading } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import '~/third-party-styles/page-layout.css';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';
type GraphWidgetAggregateChartProps = {
  value: string | number;
  trendPercentage?: number;
  prefix?: string;
  suffix?: string;
};

const styles = stylex.create({
  headingWrapper: {},
  trendPercentageValue: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    marginRight: spacing['--t-spacing-2'],
  },
  container: {
    alignItems: 'center',
    display: 'flex',
    height: '100%',
    justifyContent: 'space-between',
    width: '100%',
  },
  trendIconContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
});

export const GraphWidgetAggregateChart = ({
  value,
  trendPercentage,
  prefix,
  suffix,
}: GraphWidgetAggregateChartProps) => {
  const theme = useTheme();

  const formattedPercentage = isDefined(trendPercentage)
    ? formatNumberChartTrend(trendPercentage)
    : undefined;

  const displayValue = `${prefix ?? ''}${value}${suffix ?? ''}`;

  return (
    <div {...stylex.props(styles.container)}>
      <div data-aggregate-heading="">
        <Heading level={2} size="lg">
          {displayValue}
        </Heading>
      </div>
      {isDefined(trendPercentage) && (
        <div {...stylex.props(styles.trendIconContainer)}>
          <span {...stylex.props(styles.trendPercentageValue)}>
            {formattedPercentage}%
          </span>
          {trendPercentage >= 0 ? (
            <IconTrendingUp
              color={theme.color.turquoise8}
              size={theme.icon.size.md}
            />
          ) : (
            <IconTrendingDown
              color={theme.color.red8}
              size={theme.icon.size.md}
            />
          )}
        </div>
      )}
    </div>
  );
};
