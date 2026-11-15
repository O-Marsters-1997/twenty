import { TabListRow } from '@/ui/layout/tab-list/components/TabListRow';
import { TabListItem } from '@/ui/layout/tab-list/components/TabListItem';

import { useScrollActiveTabIntoView } from '@/ui/layout/tab-list/hooks/useScrollActiveTabIntoView';
import { type SingleTabProps } from '@/ui/layout/tab-list/types/SingleTabProps';

import { PAGE_LAYOUT_TAB_LIST_DROPPABLE_IDS } from '@/page-layout/components/PageLayoutTabListDroppableIds';
import { PageLayoutTabListReorderableTab } from '@/page-layout/components/PageLayoutTabListReorderableTab';
import { usePrerenderPageLayoutTabOnHover } from '@/page-layout/hooks/usePrerenderPageLayoutTabOnHover';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { DragDropItemDropTarget } from '@/ui/utilities/drag-and-drop/components/DragDropItemDropTarget';
import * as stylex from '@stylexjs/stylex';

type PageLayoutTabListVisibleTabsProps = {
  'aria-label': string;
  visibleTabs: SingleTabProps[];
  visibleTabCount: number;
  activeTabId: string | null;
  behaveAsLinks: boolean;
  loading?: boolean;
  onChangeTab?: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  canReorder: boolean;
  widgetDropTargetWidgetsByTabId: Map<string, PageLayoutWidget[]>;
  firstHiddenTabId: string | null;
  isScrollable: boolean;
};

const styles = stylex.create({
  tabSlot: {
    display: 'flex',
  },
  leadingDropTarget: {
    flex: '0 0 2px',
    marginLeft: '-1px',
    marginRight: '-1px',
  },
});

export const PageLayoutTabListVisibleTabs = ({
  'aria-label': ariaLabel,
  visibleTabs,
  visibleTabCount,
  activeTabId,
  behaveAsLinks,
  loading,
  onChangeTab,
  onSelectTab,
  canReorder,
  widgetDropTargetWidgetsByTabId,
  firstHiddenTabId,
  isScrollable,
}: PageLayoutTabListVisibleTabsProps) => {
  const { tabRowRef } = useScrollActiveTabIntoView({
    activeTabId,
    isScrollable,
  });

  const { handleTabMouseEnter, handleTabMouseLeave } =
    usePrerenderPageLayoutTabOnHover();

  if (canReorder) {
    const shownTabs = visibleTabs.slice(0, visibleTabCount);

    return (
      <TabListRow
        aria-label={ariaLabel}
        ref={tabRowRef}
        behaveAsLinks={false}
        isScrollable={isScrollable}
      >
        {shownTabs.map((tab, index) => (
          <div key={tab.id} {...stylex.props(styles.tabSlot)}>
            <div {...stylex.props(styles.leadingDropTarget)}>
              <DragDropItemDropTarget
                index={index}
                droppableId={PAGE_LAYOUT_TAB_LIST_DROPPABLE_IDS.VISIBLE_TABS}
                orientation="vertical"
                compact
              />
            </div>
            <PageLayoutTabListReorderableTab
              tab={tab}
              index={index}
              group={PAGE_LAYOUT_TAB_LIST_DROPPABLE_IDS.VISIBLE_TABS}
              nextTabId={shownTabs[index + 1]?.id ?? firstHiddenTabId}
              isActive={tab.id === activeTabId}
              disabled={tab.disabled ?? loading}
              widgetDropTargetWidgets={widgetDropTargetWidgetsByTabId.get(
                tab.id,
              )}
              onSelect={() => onSelectTab(tab.id)}
            />
          </div>
        ))}
        <div {...stylex.props(styles.leadingDropTarget)}>
          <DragDropItemDropTarget
            index={visibleTabCount}
            droppableId={PAGE_LAYOUT_TAB_LIST_DROPPABLE_IDS.VISIBLE_TABS}
            orientation="vertical"
            compact
          />
        </div>
      </TabListRow>
    );
  }

  return (
    <TabListRow
      aria-label={ariaLabel}
      ref={tabRowRef}
      behaveAsLinks={behaveAsLinks}
      isScrollable={isScrollable}
    >
      {visibleTabs.slice(0, visibleTabCount).map((tab) => (
        <TabListItem
          key={tab.id}
          tab={tab}
          mode={behaveAsLinks ? 'link' : 'tab'}
          active={tab.id === activeTabId}
          disabled={tab.disabled ?? loading}
          onSelect={behaveAsLinks ? onChangeTab : onSelectTab}
          onMouseEnter={
            tab.id === activeTabId || (tab.disabled ?? loading)
              ? undefined
              : () => handleTabMouseEnter(tab.id)
          }
          onMouseLeave={handleTabMouseLeave}
        />
      ))}
    </TabListRow>
  );
};
