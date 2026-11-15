import { GRAPH_TYPE_INFORMATION } from '@/side-panel/pages/page-layout/constants/GraphTypeInformation';

import { GraphType } from '@/side-panel/pages/page-layout/types/GraphType';
import { t } from '@lingui/core/macro';
import { MenuPicker } from 'twenty-ui/components/navigation';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const graphTypeOptions = [
  GraphType.VERTICAL_BAR,
  GraphType.HORIZONTAL_BAR,
  GraphType.LINE,
  GraphType.PIE,
  GraphType.AGGREGATE,
];

const styles = stylex.create({
  chartTypeSelectionContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-2'],
  },
});

type ChartTypeSelectionSectionProps = {
  currentGraphType: GraphType;
  setCurrentGraphType: (graphType: GraphType) => void;
};

export const ChartTypeSelectionSection = ({
  currentGraphType,
  setCurrentGraphType,
}: ChartTypeSelectionSectionProps) => {
  return (
    <div {...stylex.props(styles.chartTypeSelectionContainer)}>
      {graphTypeOptions.map((graphType) => {
        return (
          <MenuPicker
            id={graphType}
            selected={currentGraphType === graphType}
            key={graphType}
            icon={GRAPH_TYPE_INFORMATION[graphType].icon}
            onClick={() => {
              setCurrentGraphType(graphType);
            }}
            showLabel
            tooltipContent={t(GRAPH_TYPE_INFORMATION[graphType].label)}
          />
        );
      })}
    </div>
  );
};
