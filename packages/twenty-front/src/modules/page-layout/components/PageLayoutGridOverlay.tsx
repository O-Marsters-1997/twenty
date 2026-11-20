import { PAGE_LAYOUT_GRID_OVERLAY_Z_INDEX } from '@/page-layout/constants/PageLayoutGridOverlayZIndex';
import { useCreateWidgetFromClick } from '@/page-layout/hooks/useCreateWidgetFromClick';
import { pageLayoutCurrentBreakpointComponentState } from '@/page-layout/states/pageLayoutCurrentBreakpointComponentState';
import { pageLayoutCurrentLayoutsComponentState } from '@/page-layout/states/pageLayoutCurrentLayoutsComponentState';
import { pageLayoutSelectedCellsComponentState } from '@/page-layout/states/pageLayoutSelectedCellsComponentState';
import { calculateGridCellPosition } from '@/page-layout/utils/calculateGridCellPosition';
import { calculateTotalGridRows } from '@/page-layout/utils/calculateTotalGridRows';
import { generateCellId } from '@/page-layout/utils/generateCellId';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useMemo } from 'react';
import {
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
} from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

export const PageLayoutGridOverlay = () => {
  const pageLayoutCurrentBreakpoint = useAtomComponentStateValue(
    pageLayoutCurrentBreakpointComponentState,
  );

  const pageLayoutSelectedCells = useAtomComponentStateValue(
    pageLayoutSelectedCellsComponentState,
  );

  const pageLayoutCurrentLayouts = useAtomComponentStateValue(
    pageLayoutCurrentLayoutsComponentState,
  );

  const activeTabId = useAtomComponentStateValue(activeTabIdComponentState);

  const { createWidgetFromClick } = useCreateWidgetFromClick();

  const numberOfRows = useMemo(() => {
    const currentTabLayouts = pageLayoutCurrentLayouts[activeTabId ?? ''] ?? {
      desktop: [],
      mobile: [],
    };
    return calculateTotalGridRows(currentTabLayouts);
  }, [pageLayoutCurrentLayouts, activeTabId]);

  const isPageLayoutCurrentBreakpointMobile =
    pageLayoutCurrentBreakpoint === 'mobile';

  const numberOfColumns = pageLayoutCurrentBreakpoint === 'mobile' ? 1 : 12;

  return (
    <div
      {...stylex.props(
        styles.overlay,
        styles.zIndex(PAGE_LAYOUT_GRID_OVERLAY_Z_INDEX),
        pageLayoutCurrentBreakpoint === 'mobile'
          ? styles.overlayMobile
          : styles.overlayDesktop,
        !isPageLayoutCurrentBreakpointMobile && styles.dragSelecting,
      )}
    >
      {Array.from(
        {
          length: numberOfColumns * numberOfRows,
        },
        (_, i) => {
          const { column, row } = calculateGridCellPosition({
            index: i,
            numberOfColumns,
          });
          const cellId = generateCellId(column, row);
          return (
            <div
              key={i}
              data-selectable-id={cellId}
              onClick={() => createWidgetFromClick(cellId)}
              {...stylex.props(
                styles.cell,
                pageLayoutSelectedCells.has(cellId) && styles.cellSelected,
              )}
            />
          );
        },
      )}
    </div>
  );
};

const styles = stylex.create({
  overlay: {
    gap: spacing['--t-spacing-2'],
    display: 'grid',
    gridAutoRows: 55,
    pointerEvents: 'none',
    position: 'absolute',
    bottom: spacing['--t-spacing-2'],
    left: spacing['--t-spacing-2'],
    right: spacing['--t-spacing-2'],
    top: spacing['--t-spacing-2'],
  },
  zIndex: (zIndex: number) => ({ zIndex }),
  overlayMobile: { gridTemplateColumns: '1fr' },
  overlayDesktop: { gridTemplateColumns: 'repeat(12, 1fr)' },
  dragSelecting: { pointerEvents: 'auto' },
  cell: {
    borderColor: {
      default: borderColor['--t-border-color-light'],
      ':hover': borderColor['--t-border-color-medium'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
    cursor: 'pointer',
    transitionDuration: '0.3s',
    transitionProperty: 'background-color',
    transitionTimingFunction: 'ease',
  },
  cellSelected: {
    borderColor: {
      default: color['--t-color-blue7'],
      ':hover': borderColor['--t-border-color-medium'],
    },
    backgroundColor: {
      default: color['--t-color-blue3'],
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
  },
});
