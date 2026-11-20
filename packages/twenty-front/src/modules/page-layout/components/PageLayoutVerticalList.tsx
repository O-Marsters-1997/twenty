import { PageLayoutVerticalListWidgetSlot } from '@/page-layout/components/PageLayoutVerticalListWidgetSlot';
import { usePageLayoutContentContext } from '@/page-layout/contexts/PageLayoutContentContext';
import { useIsSideColumnContext } from '@/page-layout/hooks/useIsSideColumnContext';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { type PageLayoutWidgetListDropData } from '@/page-layout/types/PageLayoutWidgetListDropData';
import { canVerticalListAcceptWidgetDrag } from '@/page-layout/utils/canVerticalListAcceptWidgetDrag';
import { isViewportFillingWidget } from '@/page-layout/widgets/utils/isViewportFillingWidget';
import { DragDropItemDropTarget } from '@/ui/utilities/drag-and-drop/components/DragDropItemDropTarget';
import { WorkflowDiagramAllowPageScrollContext } from '@/workflow/workflow-diagram/contexts/WorkflowDiagramAllowPageScrollContext';
import { type Draggable } from '@dnd-kit/abstract';
import { pointerIntersection } from '@dnd-kit/collision';
import { useDroppable } from '@dnd-kit/react';
import { Fragment, type ReactNode, useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutTabLayoutMode } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing, background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    '--widget-card-content-overflow': 'visible',
    '--widget-height': 'auto',
    '--widget-scroll-overflow': 'visible',
    backgroundColor: 'var(--record-card-background-color)',
    display: 'flex',
    flexDirection: 'column',
  },
  backgroundPrimary: {
    '--record-card-background-color': background['--t-background-primary'],
  },
  backgroundSecondary: {
    '--record-card-background-color': background['--t-background-secondary'],
  },
  insetNone: { '--viewport-filling-widget-editor-block-inset': '0px' },
  insetEdit: {
    '--viewport-filling-widget-editor-block-inset': spacing['--t-spacing-4'],
  },
  insetSideColumn: {
    '--viewport-filling-widget-editor-block-inset': spacing['--t-spacing-2'],
  },
  minHeightEdit: { minHeight: 0 },
  minHeightFull: { minHeight: '100%' },
  paddingNone: { padding: 0 },
  paddingEdit: { padding: spacing['--t-spacing-2'] },
  paddingSideColumn: { padding: spacing['--t-spacing-1'] },
  paddingPinned: {
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-1'],
  },
  header: {
    flexShrink: '0',
    marginBottom: spacing['--t-spacing-4'],
  },
  dropTarget: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    marginTop: {
      default: null,
      ':not(:first-child)': spacing['--t-spacing-4'],
    },
    minHeight: spacing['--t-spacing-6'],
  },
});

type PageLayoutVerticalListProps = {
  isInEditMode: boolean;
  widgets: PageLayoutWidget[];
  leadingElement?: ReactNode;
  trailingElement?: ReactNode;
  renderWidgetSeparator?: (widget: PageLayoutWidget) => ReactNode;
};

export const PageLayoutVerticalList = ({
  isInEditMode,
  widgets,
  leadingElement,
  trailingElement,
  renderWidgetSeparator,
}: PageLayoutVerticalListProps) => {
  const { layoutMode, tabId } = usePageLayoutContentContext();

  const { isInPinnedTab, isMobile, isSideColumnContext } =
    useIsSideColumnContext();

  // Preserve Canvas sizing for layouts skipped by the persisted migration.
  const isLegacyCanvasViewport =
    layoutMode === PageLayoutTabLayoutMode.CANVAS &&
    widgets.length === 1 &&
    !isInEditMode &&
    !isInPinnedTab;

  // A viewport-filling slot is exactly one viewport tall, so the list only
  // overflows when something else shares it. Widgets that capture the wheel
  // (workflow canvases) must keep it when there is no page scroll to reach.
  const hasPageScroll = isInEditMode || widgets.length > 1;

  const firstViewportFillingWidgetIndex = widgets.findIndex(
    isViewportFillingWidget,
  );
  const hasViewportFillingWidget = firstViewportFillingWidgetIndex !== -1;

  const endDropData: PageLayoutWidgetListDropData = {
    type: 'widget-list',
    tabId,
    itemCount: widgets.length,
  };

  const canAcceptWidgetDrag = useCallback(
    (source: Draggable) =>
      canVerticalListAcceptWidgetDrag({
        destinationWidgets: widgets,
        source,
      }),
    [widgets],
  );

  const { ref: endDropZoneRef } = useDroppable({
    id: `page-layout-widget-list-${tabId}`,
    accept: canAcceptWidgetDrag,
    collisionDetector: pointerIntersection,
    data: endDropData,
    disabled: !isInEditMode || hasViewportFillingWidget,
  });

  return (
    <div
      {...stylex.props(
        styles.container,
        !isInPinnedTab || isMobile
          ? styles.backgroundPrimary
          : styles.backgroundSecondary,
        isInEditMode
          ? isSideColumnContext
            ? styles.insetSideColumn
            : styles.insetEdit
          : styles.insetNone,
        isInEditMode ? styles.minHeightEdit : styles.minHeightFull,
        isInEditMode
          ? isInPinnedTab
            ? styles.paddingPinned
            : isSideColumnContext
              ? styles.paddingSideColumn
              : styles.paddingEdit
          : styles.paddingNone,
      )}
    >
      <WorkflowDiagramAllowPageScrollContext.Provider value={hasPageScroll}>
        {isInEditMode && isDefined(leadingElement) && (
          <div {...stylex.props(styles.header)}>{leadingElement}</div>
        )}
        {widgets.map((widget, index) => (
          <Fragment key={widget.id}>
            {isInEditMode &&
              index > 0 &&
              (!hasViewportFillingWidget ||
                index <= firstViewportFillingWidgetIndex) &&
              renderWidgetSeparator?.(widget)}
            <PageLayoutVerticalListWidgetSlot
              canAcceptWidgetDrag={canAcceptWidgetDrag}
              index={index}
              isInEditMode={isInEditMode}
              fillsViewport={
                isLegacyCanvasViewport ||
                (layoutMode === PageLayoutTabLayoutMode.VERTICAL_LIST &&
                  isViewportFillingWidget(widget))
              }
              shouldShowDivider={isSideColumnContext}
              tabId={tabId}
              widget={widget}
            />
          </Fragment>
        ))}
        {isInEditMode && !hasViewportFillingWidget && (
          <div ref={endDropZoneRef} {...stylex.props(styles.dropTarget)}>
            <DragDropItemDropTarget
              index={widgets.length}
              droppableId={tabId}
              orientation="horizontal"
              compact
            />
            {trailingElement}
          </div>
        )}
      </WorkflowDiagramAllowPageScrollContext.Provider>
    </div>
  );
};
