import { type Draggable } from '@dnd-kit/abstract';
import { pointerIntersection } from '@dnd-kit/collision';
import { useDroppable } from '@dnd-kit/react';
import { type ReactNode, useCallback } from 'react';

import { PAGE_LAYOUT_TAB_DROP_TARGET_DATA_ATTRIBUTE } from '@/page-layout/constants/PageLayoutTabDropTargetDataAttribute';
import { pageLayoutGridDragHoveredTabIdComponentState } from '@/page-layout/states/pageLayoutGridDragHoveredTabIdComponentState';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { type PageLayoutTabWidgetDropData } from '@/page-layout/types/PageLayoutTabWidgetDropData';
import { canVerticalListAcceptWidgetDrag } from '@/page-layout/utils/canVerticalListAcceptWidgetDrag';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { borderRadius, color } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

type PageLayoutTabWidgetDropTargetProps = {
  tabId: string;
  destinationWidgets: PageLayoutWidget[];
  children: ReactNode;
};

export const PageLayoutTabWidgetDropTarget = ({
  tabId,
  destinationWidgets,
  children,
}: PageLayoutTabWidgetDropTargetProps) => {
  const data: PageLayoutTabWidgetDropData = {
    type: 'tab-widget-drop',
    tabId,
  };

  const canAcceptWidgetDrag = useCallback(
    (source: Draggable) =>
      canVerticalListAcceptWidgetDrag({ destinationWidgets, source }),
    [destinationWidgets],
  );

  const { ref, isDropTarget } = useDroppable({
    id: `page-layout-tab-widget-drop-${tabId}`,
    accept: canAcceptWidgetDrag,
    collisionDetector: pointerIntersection,
    data,
  });

  // Grid drags bypass dnd-kit, so their hover highlight comes from pointer hit-testing.
  const pageLayoutGridDragHoveredTabId = useAtomComponentStateValue(
    pageLayoutGridDragHoveredTabIdComponentState,
  );

  const isActive = isDropTarget || pageLayoutGridDragHoveredTabId === tabId;

  return (
    <div
      ref={ref}
      data-widget-hover={isActive || undefined}
      {...{ [PAGE_LAYOUT_TAB_DROP_TARGET_DATA_ATTRIBUTE]: tabId }}
      {...stylex.props(styles.dropTarget, isActive && styles.dropTargetActive)}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  dropTarget: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    outline: 'none',
    outlineOffset: -1,
    zIndex: 'auto',
  },
  dropTargetActive: {
    outlineColor: color['--t-color-blue'],
    outlineStyle: 'solid',
    outlineWidth: 1,
    zIndex: 1,
  },
});
