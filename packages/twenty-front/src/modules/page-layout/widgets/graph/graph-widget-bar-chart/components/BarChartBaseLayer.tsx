import { BarChartBaseLayerEffect } from '@/page-layout/widgets/graph/graph-widget-bar-chart/components/BarChartBaseLayerEffect';
import { type BarPosition } from '@/page-layout/widgets/graph/graph-widget-bar-chart/types/BarPosition';
import { type ChartMargins } from '@/page-layout/widgets/graph/types/ChartMargins';
import { useRef } from 'react';
import { type BarChartLayout } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';

type BarChartBaseLayerProps = {
  bars: BarPosition[];
  chartWidth: number;
  chartHeight: number;
  margins: ChartMargins;
  layout: BarChartLayout;
  valueDomain: { min: number; max: number };
  valueTickValues: number[];
  showGrid: boolean;
  highlightedLegendId: string | null;
  allowDataTransitions: boolean;
};

const styles = stylex.create({
  baseCanvas: {
    display: 'block',
    pointerEvents: 'none',
    position: 'absolute',
    left: '0',
    top: '0',
  },
});

export const BarChartBaseLayer = ({
  bars,
  chartWidth,
  chartHeight,
  margins,
  layout,
  valueDomain,
  valueTickValues,
  showGrid,
  highlightedLegendId,
  allowDataTransitions,
}: BarChartBaseLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <>
      <canvas ref={canvasRef} {...stylex.props(styles.baseCanvas)} />
      <BarChartBaseLayerEffect
        bars={bars}
        chartHeight={chartHeight}
        chartWidth={chartWidth}
        layout={layout}
        margins={margins}
        valueDomain={valueDomain}
        valueTickValues={valueTickValues}
        showGrid={showGrid}
        highlightedLegendId={highlightedLegendId}
        allowDataTransitions={allowDataTransitions}
        canvasRef={canvasRef}
      />
    </>
  );
};
