import { PageLayoutGridLayoutDragSelector } from '@/page-layout/components/PageLayoutGridLayoutDragSelector';
import { PageLayoutGridOverlay } from '@/page-layout/components/PageLayoutGridOverlay';
import { PageLayoutGridResizeHandle } from '@/page-layout/components/PageLayoutGridResizeHandle';
import { ReactGridLayoutCardWrapper } from '@/page-layout/components/ReactGridLayoutCardWrapper';
import { EMPTY_LAYOUT } from '@/page-layout/constants/EmptyLayout';
import {
  PAGE_LAYOUT_CONFIG,
  type PageLayoutBreakpoint,
} from '@/page-layout/constants/PageLayoutBreakpoints';
import { PAGE_LAYOUT_GRID_MARGIN } from '@/page-layout/constants/PageLayoutGridMargin';
import { PAGE_LAYOUT_GRID_ROW_HEIGHT } from '@/page-layout/constants/PageLayoutGridRowHeight';
import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { usePageLayoutGridCrossTabDrop } from '@/page-layout/hooks/usePageLayoutGridCrossTabDrop';
import { usePageLayoutHandleLayoutChange } from '@/page-layout/hooks/usePageLayoutHandleLayoutChange';
import { usePageLayoutTabWithVisibleWidgetsOrThrow } from '@/page-layout/hooks/usePageLayoutTabWithVisibleWidgetsOrThrow';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { pageLayoutCurrentBreakpointComponentState } from '@/page-layout/states/pageLayoutCurrentBreakpointComponentState';
import { pageLayoutCurrentLayoutsComponentState } from '@/page-layout/states/pageLayoutCurrentLayoutsComponentState';
import { pageLayoutDraggedAreaComponentState } from '@/page-layout/states/pageLayoutDraggedAreaComponentState';
import { pageLayoutDraggingWidgetIdComponentState } from '@/page-layout/states/pageLayoutDraggingWidgetIdComponentState';
import { pageLayoutResizingWidgetIdComponentState } from '@/page-layout/states/pageLayoutResizingWidgetIdComponentState';
import { addPendingPlaceholderToLayouts } from '@/page-layout/utils/addPendingPlaceholderToLayouts';
import { filterPendingPlaceholderFromLayouts } from '@/page-layout/utils/filterPendingPlaceholderFromLayouts';
import { prepareGridLayoutItemsWithPlaceholders } from '@/page-layout/utils/prepareGridLayoutItemsWithPlaceholders';
import { WidgetPlaceholder } from '@/page-layout/widgets/components/WidgetPlaceholder';
import { WidgetRenderer } from '@/page-layout/widgets/components/WidgetRenderer';
import { TabListComponentInstanceContext } from '@/ui/layout/tab-list/states/contexts/TabListComponentInstanceContext';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import * as stylex from '@stylexjs/stylex';
import { useMemo } from 'react';
import '~/third-party-styles/react-grid-layout.css';
import {
  type Layout,
  Responsive,
  type ResponsiveLayouts,
  useContainerWidth,
  verticalCompactor,
} from 'react-grid-layout';
import { isDefined } from 'twenty-shared/utils';
import { media } from 'twenty-ui/theme/constants.stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    padding: { default: spacing['--t-spacing-2'], [media.print]: 0 },
    boxSizing: 'border-box',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    position: 'relative',
    userSelect: { default: 'none', [media.print]: 'auto' },
    minHeight: { default: '100%', [media.print]: 'auto' },
    width: '100%',
  },
});

type PageLayoutGridLayoutProps = {
  tabId: string;
};

export const PageLayoutGridLayout = ({ tabId }: PageLayoutGridLayoutProps) => {
  const pageLayoutId = useAvailableComponentInstanceIdOrThrow(
    PageLayoutComponentInstanceContext,
  );

  const tabListInstanceId = useAvailableComponentInstanceIdOrThrow(
    TabListComponentInstanceContext,
  );

  const setPageLayoutCurrentBreakpoint = useSetAtomComponentState(
    pageLayoutCurrentBreakpointComponentState,
  );

  const setPageLayoutDraggingWidgetId = useSetAtomComponentState(
    pageLayoutDraggingWidgetIdComponentState,
  );

  const setPageLayoutResizingWidgetId = useSetAtomComponentState(
    pageLayoutResizingWidgetIdComponentState,
  );

  const { handleLayoutChange } = usePageLayoutHandleLayoutChange({
    pageLayoutId,
    tabListInstanceId,
  });

  const {
    handleGridDrag,
    handleGridDragStop,
    consumeShouldIgnoreNextGridLayoutChange,
  } = usePageLayoutGridCrossTabDrop({
    tabId,
  });

  const {
    width,
    containerRef: gridContainerRef,
    mounted,
  } = useContainerWidth();

  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const pageLayoutCurrentLayouts = useAtomComponentStateValue(
    pageLayoutCurrentLayoutsComponentState,
  );

  const pageLayoutDraggedArea = useAtomComponentStateValue(
    pageLayoutDraggedAreaComponentState,
  );
  const pageLayoutDraggingWidgetId = useAtomComponentStateValue(
    pageLayoutDraggingWidgetIdComponentState,
  );

  const activeTab = usePageLayoutTabWithVisibleWidgetsOrThrow(tabId);

  const activeTabWidgets = activeTab.widgets;

  const isLayoutEmpty =
    !isDefined(activeTabWidgets) || activeTabWidgets.length === 0;

  const hasPendingPlaceholder = isDefined(pageLayoutDraggedArea);

  const handleLayoutChangeWithoutPendingPlaceholder = (
    currentLayout: Layout,
    allLayouts: ResponsiveLayouts,
  ) => {
    if (consumeShouldIgnoreNextGridLayoutChange()) {
      return;
    }

    handleLayoutChange(
      currentLayout,
      filterPendingPlaceholderFromLayouts(allLayouts),
    );
  };

  const baseLayouts = isLayoutEmpty
    ? EMPTY_LAYOUT
    : (pageLayoutCurrentLayouts[tabId] ?? EMPTY_LAYOUT);

  const layouts = hasPendingPlaceholder
    ? addPendingPlaceholderToLayouts(baseLayouts, pageLayoutDraggedArea)
    : baseLayouts;

  const gridLayoutItems = useMemo(
    () =>
      prepareGridLayoutItemsWithPlaceholders(
        activeTabWidgets,
        hasPendingPlaceholder,
      ),
    [activeTabWidgets, hasPendingPlaceholder],
  );

  const shouldDisableTransitions = !isDefined(pageLayoutDraggingWidgetId);

  return (
    <div
      ref={gridContainerRef}
      data-grid-container=""
      data-grid-static={shouldDisableTransitions || undefined}
      {...stylex.props(styles.container)}
    >
      {isPageLayoutInEditMode && (
        <>
          <PageLayoutGridOverlay />
          <PageLayoutGridLayoutDragSelector
            gridContainerRef={gridContainerRef}
          />
        </>
      )}

      {mounted && (
        <Responsive
          className="layout"
          width={width}
          layouts={layouts}
          breakpoints={PAGE_LAYOUT_CONFIG.breakpoints}
          cols={PAGE_LAYOUT_CONFIG.columns}
          rowHeight={PAGE_LAYOUT_GRID_ROW_HEIGHT}
          containerPadding={[0, 0]}
          margin={[PAGE_LAYOUT_GRID_MARGIN, PAGE_LAYOUT_GRID_MARGIN]}
          compactor={verticalCompactor}
          dragConfig={{
            enabled: isPageLayoutInEditMode && !isLayoutEmpty,
            handle: '.drag-handle',
          }}
          resizeConfig={{
            enabled: isPageLayoutInEditMode && !isLayoutEmpty,
            handles: ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'],
            handleComponent:
              isPageLayoutInEditMode && !isLayoutEmpty ? (
                <PageLayoutGridResizeHandle />
              ) : undefined,
          }}
          onDragStart={(_layout, _oldItem, newItem) => {
            if (isDefined(newItem)) {
              setPageLayoutDraggingWidgetId(newItem.i);
            }
          }}
          onDrag={(_layout, _oldItem, _newItem, _placeholder, event) => {
            handleGridDrag(event);
          }}
          onDragStop={(_layout, _oldItem, newItem, _placeholder, event) => {
            if (isDefined(newItem)) {
              handleGridDragStop(newItem.i, event);
            }
            setPageLayoutDraggingWidgetId(null);
          }}
          onResizeStart={(_layout, _oldItem, newItem) => {
            if (isDefined(newItem)) {
              setPageLayoutResizingWidgetId(newItem.i);
            }
          }}
          onResizeStop={() => {
            setPageLayoutResizingWidgetId(null);
          }}
          onLayoutChange={handleLayoutChangeWithoutPendingPlaceholder}
          onBreakpointChange={(newBreakpoint) =>
            setPageLayoutCurrentBreakpoint(
              newBreakpoint as PageLayoutBreakpoint,
            )
          }
        >
          {gridLayoutItems.map((item) => (
            <ReactGridLayoutCardWrapper key={item.id}>
              {item.type === 'placeholder' ? (
                <WidgetPlaceholder />
              ) : (
                <WidgetRenderer widget={item.widget} />
              )}
            </ReactGridLayoutCardWrapper>
          ))}
        </Responsive>
      )}
    </div>
  );
};
