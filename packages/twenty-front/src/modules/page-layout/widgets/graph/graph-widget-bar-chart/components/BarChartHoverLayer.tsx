import { BarChartHoverLayerEffect } from '@/page-layout/widgets/graph/graph-widget-bar-chart/components/BarChartHoverLayerEffect';
import { type BarChartSlice } from '@/page-layout/widgets/graph/graph-widget-bar-chart/types/BarChartSlice';
import { type ChartMargins } from '@/page-layout/widgets/graph/types/ChartMargins';
import { useRef } from 'react';
import { type BarChartLayout } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';

type BarChartHoverLayerProps = {
  hoveredSlice: BarChartSlice | null;
  chartWidth: number;
  chartHeight: number;
  margins: ChartMargins;
  layout: BarChartLayout;
};

const styles = stylex.create({
  hoverCanvas: {
    display: 'block',
    position: 'absolute',
    left: '0',
    top: '0',
  },
});

export const BarChartHoverLayer = ({
  hoveredSlice,
  chartWidth,
  chartHeight,
  margins,
  layout,
}: BarChartHoverLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <>
      <canvas ref={canvasRef} {...stylex.props(styles.hoverCanvas)} />
      <BarChartHoverLayerEffect
        hoveredSlice={hoveredSlice}
        chartHeight={chartHeight}
        chartWidth={chartWidth}
        layout={layout}
        margins={margins}
        canvasRef={canvasRef}
      />
    </>
  );
};
