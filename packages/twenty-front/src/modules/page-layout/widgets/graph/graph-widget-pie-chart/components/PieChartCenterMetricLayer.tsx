import { usePieChartCenterMetricData } from '@/page-layout/widgets/graph/graph-widget-pie-chart/hooks/usePieChartCenterMetricData';
import { useLingui } from '@lingui/react/macro';
import { AnimatePresence, motion } from 'framer-motion';
import { type PieChartConfiguration } from '~/generated-metadata/graphql';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight } from 'twenty-ui/theme/tokens.stylex';

type PieChartCenterMetricProps = {
  objectMetadataItemId: string;
  configuration: PieChartConfiguration;
  show: boolean;
  hasNoData?: boolean;
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    left: '50%',
    top: '50%',
  },
  value: {
    color: fontColor['--t-font-color-primary'],
    fontSize: 'clamp(12px, 10cqmin, 48px)',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  label: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: 'clamp(10px, 5cqmin, 24px)',
  },
  noDataText: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
  },
});

export const PieChartCenterMetric = ({
  objectMetadataItemId,
  configuration,
  show,
  hasNoData = false,
}: PieChartCenterMetricProps) => {
  const theme = useTheme();
  const { t } = useLingui();

  const { centerMetricValue, centerMetricLabel } = usePieChartCenterMetricData({
    objectMetadataItemId,
    configuration,
    skip: !show && !hasNoData,
  });

  const shouldShowContent = show || hasNoData;

  return (
    <AnimatePresence>
      {shouldShowContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: theme.animation.duration.fast,
            ease: 'easeInOut',
          }}
          {...stylex.props(styles.container)}
        >
          {hasNoData ? (
            <span {...stylex.props(styles.noDataText)}>{t`No data`}</span>
          ) : (
            <>
              <span {...stylex.props(styles.value)}>{centerMetricValue}</span>
              <span {...stylex.props(styles.label)}>{centerMetricLabel}</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
