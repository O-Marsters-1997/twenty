import { PAGE_LAYOUT_WIDGET_DND_TYPE } from '@/page-layout/constants/PageLayoutWidgetDndType';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { type PageLayoutWidgetDragData } from '@/page-layout/types/PageLayoutWidgetDragData';
import { WidgetRenderer } from '@/page-layout/widgets/components/WidgetRenderer';
import { DragDropItemDropTarget } from '@/ui/utilities/drag-and-drop/components/DragDropItemDropTarget';
import { DragDropItemSortableCell } from '@/ui/utilities/drag-and-drop/components/DragDropItemSortableCell';
import { type Draggable } from '@dnd-kit/abstract';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';

type PageLayoutVerticalListWidgetSlotProps = {
  canAcceptWidgetDrag: (source: Draggable) => boolean;
  index: number;
  isInEditMode: boolean;
  fillsViewport: boolean;
  shouldShowDivider: boolean;
  tabId: string;
  widget: PageLayoutWidget;
};

export const PageLayoutVerticalListWidgetSlot = ({
  canAcceptWidgetDrag,
  index,
  isInEditMode,
  fillsViewport,
  shouldShowDivider,
  tabId,
  widget,
}: PageLayoutVerticalListWidgetSlotProps) => {
  const widgetDragData: PageLayoutWidgetDragData = {
    type: 'widget',
    widgetId: widget.id,
    widgetType: widget.type,
    widgetPosition: widget.position,
    tabId,
    index,
  };

  return (
    <div
      {...mergeClassName(
        stylex.props(
          styles.slot,
          !isInEditMode && shouldShowDivider && styles.slotDivider,
        ),
        fillsViewport ? 'page-layout-viewport-filling-widget-slot' : undefined,
      )}
    >
      <DragDropItemDropTarget
        index={index}
        droppableId={tabId}
        orientation="horizontal"
        compact
      />
      <DragDropItemSortableCell
        id={widget.id}
        index={index}
        group={tabId}
        data={widgetDragData}
        type={PAGE_LAYOUT_WIDGET_DND_TYPE}
        accept={canAcceptWidgetDrag}
        allowNativeDragWhenDisabled
        disabled={!isInEditMode}
        hasTransition={false}
        highlightWhileDragging={isInEditMode}
        orientation="horizontal"
        fill={fillsViewport}
      >
        <WidgetRenderer widget={widget} />
      </DragDropItemSortableCell>
    </div>
  );
};

const styles = stylex.create({
  slot: {
    display: 'flex',
    flexBasis: 'auto',
    flexDirection: 'column',
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    minWidth: 0,
  },
  slotDivider: {
    borderBottomColor: {
      default: null,
      ':not(:last-child)': borderColor['--t-border-color-light'],
    },
    borderBottomStyle: { default: null, ':not(:last-child)': 'solid' },
    borderBottomWidth: { default: null, ':not(:last-child)': 1 },
  },
});
