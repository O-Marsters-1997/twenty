import { useDragDropMonitor } from '@dnd-kit/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconPlus, useIcons } from 'twenty-ui/icon';
import { Dropdown, TabButton } from 'twenty-ui/components/navigation';

import { isPageLayoutTabDraggingComponentState } from '@/page-layout/states/isPageLayoutTabDraggingComponentState';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { useOpenDropdown } from '@/ui/layout/dropdown/hooks/useOpenDropdown';
import { TabListHiddenMeasurements } from '@/ui/layout/tab-list/components/TabListHiddenMeasurements';
import { TAB_LIST_GAP } from '@/ui/layout/tab-list/constants/TabListGap';
import { TAB_LIST_HORIZONTAL_PADDING } from '@/ui/layout/tab-list/constants/TabListPadding';
import { useTabListMeasurements } from '@/ui/layout/tab-list/hooks/useTabListMeasurements';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { TabListComponentInstanceContext } from '@/ui/layout/tab-list/states/contexts/TabListComponentInstanceContext';
import { type TabListProps } from '@/ui/layout/tab-list/types/TabListProps';
import { NodeDimension } from '@/ui/utilities/dimensions/components/NodeDimension';
import { useIsMobile } from 'twenty-ui/utilities';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';

import { PAGE_LAYOUT_TAB_LIST_END_DROP_ZONE_WIDTH } from '@/page-layout/constants/PageLayoutTabListEndDropZoneWidth';
import { PageLayoutTabListNewTabDropdownContent } from '@/page-layout/components/PageLayoutTabListNewTabDropdownContent';
import { PageLayoutTabListReorderableOverflowDropdown } from '@/page-layout/components/PageLayoutTabListReorderableOverflowDropdown';
import { PageLayoutTabListVisibleTabs } from '@/page-layout/components/PageLayoutTabListVisibleTabs';
import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { useOpenPageLayoutTabSettings } from '@/page-layout/hooks/useOpenPageLayoutTabSettings';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { pageLayoutTabSettingsOpenTabIdComponentState } from '@/page-layout/states/pageLayoutTabSettingsOpenTabIdComponentState';
import { type PageLayoutAddTabStrategy } from '@/page-layout/types/PageLayoutAddTabStrategy';
import { type PageLayoutTab } from '@/page-layout/types/PageLayoutTab';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { type PageLayoutWidgetDndData } from '@/page-layout/types/PageLayoutWidgetDndData';
import { shouldEnableTabEditingFeatures } from '@/page-layout/utils/shouldEnableTabEditingFeatures';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { TabListDropdown } from '@/ui/layout/tab-list/components/TabListDropdown';
import { type SingleTabProps } from '@/ui/layout/tab-list/types/SingleTabProps';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { isDefined } from 'twenty-shared/utils';
import {
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing, borderColor } from 'twenty-ui/theme/tokens.stylex';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';

const styles = stylex.create({
  nodeDimension: { minWidth: 0 },
  identifierBarTrack: { flexBasis: '0%', flexGrow: 1, flexShrink: 1 },
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'flex-start',
    position: 'relative',
    userSelect: 'none',
    height: 'var(--tab-list-row-height)',
    paddingLeft: spacing['--t-spacing-2'],
    width: '100%',
  },
  containerStandalone: {
    '--tab-list-row-height': spacing['--t-spacing-10'],
    paddingRight: 0,
    '::after': {
      backgroundColor: borderColor['--t-border-color-light'],
      content: '""',
      display: 'block',
      position: 'absolute',
      bottom: 0,
      height: 1,
      left: 0,
      right: 0,
    },
  },
  containerInIdentifierBar: {
    '--tab-list-row-height': '40px',
    paddingRight: spacing['--t-spacing-2'],
  },
  containerCentered: { justifyContent: 'center' },
  addButton: {
    alignItems: 'center',
    display: 'flex',
    height: `var(--tab-list-row-height, ${spacing['--t-spacing-10']})`,
  },
  addButtonGap: (gap: number) => ({ marginLeft: gap }),
  dropdownContainer: {
    alignItems: 'center',
    display: 'flex',
  },
});

type PageLayoutTabListProps = Omit<TabListProps, 'tabs'> & {
  tabs: PageLayoutTab[];
  presentation?: 'standalone' | 'identifier-bar';
  isReorderEnabled: boolean;
  addTabStrategy?: PageLayoutAddTabStrategy;
  behaveAsLinks: boolean;
  pageLayoutType: PageLayoutType;
};

export const PageLayoutTabList = ({
  'aria-label': ariaLabel,
  tabs,
  loading,
  behaveAsLinks,
  className,
  presentation = 'standalone',
  centerTabs = false,
  componentInstanceId,
  onChangeTab,
  addTabStrategy,
  isReorderEnabled,
  pageLayoutType,
}: PageLayoutTabListProps) => {
  const { getIcon } = useIcons();
  const { t } = useLingui();
  const workspaceSurface = useWorkspaceSurface();
  const isInIdentifierBar = presentation === 'identifier-bar';

  const tabsWithIcons: SingleTabProps[] = tabs.map((tab) => ({
    id: tab.id,
    title: tab.title,
    Icon: isDefined(tab.icon) ? getIcon(tab.icon) : undefined,
  }));

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [activeTabId, setActiveTabId] = useAtomComponentState(
    activeTabIdComponentState,
    componentInstanceId,
  );

  const {
    visibleTabCount,
    hiddenTabs,
    hiddenTabsCount,
    hasHiddenTabs,
    onTabWidthChange,
    onContainerWidthChange,
    onMoreButtonWidthChange,
    onAddButtonWidthChange,
  } = useTabListMeasurements({
    visibleTabs: tabsWithIcons,
    hasAddButton: isDefined(addTabStrategy),
    rightPadding: isInIdentifierBar ? TAB_LIST_HORIZONTAL_PADDING : 0,
  });

  const pageLayoutId = useAvailableComponentInstanceIdOrThrow(
    PageLayoutComponentInstanceContext,
  );

  const dropdownId = `tab-overflow-${componentInstanceId}`;
  const addTabDropdownId = `tab-add-${componentInstanceId}`;
  const tabListContainerRef = useRef<HTMLDivElement>(null);
  const { closeDropdown } = useCloseDropdown();
  const { openDropdown } = useOpenDropdown();

  const setIsPageLayoutTabDragging = useSetAtomComponentState(
    isPageLayoutTabDraggingComponentState,
    componentInstanceId,
  );

  const isActiveTabHidden = useMemo(() => {
    if (!hasHiddenTabs) return false;
    return hiddenTabs.some((tab) => tab.id === activeTabId);
  }, [hasHiddenTabs, hiddenTabs, activeTabId]);

  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const selectTab = useCallback(
    (tabId: string) => {
      if (!isPageLayoutInEditMode && workspaceSurface.ownsRouteLocation) {
        navigate(
          { search: location.search, hash: `#${tabId}` },
          {
            replace: workspaceSurface.type === 'side-panel',
            state: location.state,
          },
        );
      }
      setActiveTabId(tabId);
      onChangeTab?.(tabId);
    },
    [
      isPageLayoutInEditMode,
      navigate,
      location.search,
      location.state,
      onChangeTab,
      setActiveTabId,
      workspaceSurface.ownsRouteLocation,
      workspaceSurface.type,
    ],
  );

  const selectTabFromDropdown = useCallback(
    (tabId: string) => {
      if (behaveAsLinks) {
        navigate(
          { search: location.search, hash: `#${tabId}` },
          {
            replace: workspaceSurface.type === 'side-panel',
            state: location.state,
          },
        );
        onChangeTab?.(tabId);
        return;
      }

      selectTab(tabId);
    },
    [
      behaveAsLinks,
      location.search,
      location.state,
      selectTab,
      navigate,
      onChangeTab,
      workspaceSurface.type,
    ],
  );

  const closeOverflowDropdown = useCallback(() => {
    closeDropdown(dropdownId);
  }, [closeDropdown, dropdownId]);

  useDragDropMonitor({
    onDragStart: (event) => {
      const sourceData = event.operation.source?.data as
        | PageLayoutWidgetDndData
        | undefined;

      if (sourceData?.type !== 'tab') {
        return;
      }

      setIsPageLayoutTabDragging(true);
    },
    onDragEnd: (event) => {
      const sourceData = event.operation.source?.data as
        | PageLayoutWidgetDndData
        | undefined;

      if (sourceData?.type !== 'tab') {
        return;
      }

      const target = event.operation.target;
      const targetData = target?.data as PageLayoutWidgetDndData | undefined;
      requestAnimationFrame(() => setIsPageLayoutTabDragging(false));

      if (!event.canceled && targetData?.type === 'tab-more-button') {
        openDropdown({
          dropdownComponentInstanceIdFromProps: dropdownId,
        });
      }
    },
  });

  const [pageLayoutTabSettingsOpenTabId, setPageLayoutTabSettingsOpenTabId] =
    useAtomComponentState(
      pageLayoutTabSettingsOpenTabIdComponentState,
      pageLayoutId,
    );
  const { openTabSettings } = useOpenPageLayoutTabSettings(pageLayoutId);
  const { closeSidePanelMenu } = useSidePanelMenu();

  const isTabSettingsOpen = isDefined(pageLayoutTabSettingsOpenTabId);

  // Reserve the strip's end drop zone, which the tab measurement doesn't know about.
  const handleContainerWidthChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      onContainerWidthChange(
        isReorderEnabled
          ? {
              ...dimensions,
              width: Math.max(
                dimensions.width - PAGE_LAYOUT_TAB_LIST_END_DROP_ZONE_WIDTH,
                0,
              ),
            }
          : dimensions,
      );
    },
    [onContainerWidthChange, isReorderEnabled],
  );

  const handleSelectTab = useCallback(
    ({
      tabId,
      select = selectTab,
    }: {
      tabId: string;
      select?: (tabId: string) => void;
    }) => {
      const shouldOpenSettings =
        isPageLayoutInEditMode &&
        shouldEnableTabEditingFeatures(pageLayoutType);

      if (shouldOpenSettings && activeTabId === tabId) {
        openTabSettings(tabId);
        return;
      }

      if (shouldOpenSettings && isTabSettingsOpen) {
        if (pageLayoutType === PageLayoutType.RECORD_PAGE) {
          closeSidePanelMenu();
          setPageLayoutTabSettingsOpenTabId(null);
        } else {
          openTabSettings(tabId);
        }
      }

      select(tabId);
    },
    [
      isPageLayoutInEditMode,
      pageLayoutType,
      activeTabId,
      isTabSettingsOpen,
      closeSidePanelMenu,
      setPageLayoutTabSettingsOpenTabId,
      openTabSettings,
      selectTab,
    ],
  );

  const handleSelectTabFromDropdown = useCallback(
    (tabId: string) => {
      handleSelectTab({ tabId, select: selectTabFromDropdown });
    },
    [handleSelectTab, selectTabFromDropdown],
  );

  if (tabsWithIcons.length === 0) {
    return null;
  }

  const canReorderTabs = isReorderEnabled;

  const shouldScrollTabs = isMobile && !canReorderTabs;

  const shouldRenderReorderableDropdown = hasHiddenTabs && canReorderTabs;

  const shouldRenderStaticDropdown =
    hasHiddenTabs && !canReorderTabs && !shouldScrollTabs;

  // Record pages take widget drops on vertical-list tabs, dashboards on grid tabs (hit-tested).
  const widgetDropTargetWidgetsByTabId = new Map<string, PageLayoutWidget[]>(
    pageLayoutType === PageLayoutType.RECORD_PAGE
      ? tabs
          .filter(
            (tab) => tab.layoutMode === PageLayoutTabLayoutMode.VERTICAL_LIST,
          )
          .map((tab) => [tab.id, tab.widgets] as const)
      : pageLayoutType === PageLayoutType.DASHBOARD
        ? tabs
            .filter(
              (tab) => tab.layoutMode !== PageLayoutTabLayoutMode.VERTICAL_LIST,
            )
            .map((tab) => [tab.id, tab.widgets] as const)
        : [],
  );

  return (
    <TabListComponentInstanceContext.Provider
      value={{ instanceId: componentInstanceId }}
    >
      {tabsWithIcons.length > 1 && !shouldScrollTabs && (
        <TabListHiddenMeasurements
          visibleTabs={tabsWithIcons}
          activeTabId={activeTabId}
          loading={loading}
          onTabWidthChange={onTabWidthChange}
          onMoreButtonWidthChange={onMoreButtonWidthChange}
          onAddButtonWidthChange={
            addTabStrategy ? onAddButtonWidthChange : undefined
          }
          addButtonMeasurement={
            addTabStrategy ? (
              <div
                {...stylex.props(
                  styles.addButton,
                  styles.addButtonGap(TAB_LIST_GAP),
                )}
              >
                <TabButton startIcon={<IconPlus />}>{t`New Tab`}</TabButton>
              </div>
            ) : undefined
          }
        />
      )}

      <NodeDimension
        onDimensionChange={handleContainerWidthChange}
        {...stylex.props(
          styles.nodeDimension,
          isInIdentifierBar && styles.identifierBarTrack,
        )}
      >
        <div
          ref={tabListContainerRef}
          {...mergeClassName(
            stylex.props(
              styles.container,
              isInIdentifierBar
                ? styles.containerInIdentifierBar
                : styles.containerStandalone,
              centerTabs && styles.containerCentered,
            ),
            className,
          )}
        >
          <PageLayoutTabListVisibleTabs
            aria-label={ariaLabel}
            visibleTabs={tabsWithIcons}
            visibleTabCount={
              shouldScrollTabs ? tabsWithIcons.length : visibleTabCount
            }
            isScrollable={shouldScrollTabs}
            activeTabId={activeTabId}
            behaveAsLinks={behaveAsLinks}
            loading={loading}
            onChangeTab={onChangeTab}
            onSelectTab={(tabId) => {
              handleSelectTab({ tabId });
              closeOverflowDropdown();
            }}
            canReorder={canReorderTabs}
            widgetDropTargetWidgetsByTabId={widgetDropTargetWidgetsByTabId}
            firstHiddenTabId={
              hasHiddenTabs ? (hiddenTabs[0]?.id ?? null) : null
            }
          />

          {shouldRenderReorderableDropdown && (
            <div {...stylex.props(styles.dropdownContainer)}>
              <PageLayoutTabListReorderableOverflowDropdown
                dropdownId={dropdownId}
                hiddenTabs={hiddenTabs}
                hiddenTabsCount={hiddenTabsCount}
                isActiveTabHidden={isActiveTabHidden}
                activeTabId={activeTabId || ''}
                loading={loading}
                onSelect={handleSelectTabFromDropdown}
                visibleTabCount={visibleTabCount}
                pageLayoutType={pageLayoutType}
                tabListContainerRef={tabListContainerRef}
              />
            </div>
          )}

          {shouldRenderStaticDropdown && (
            <div {...stylex.props(styles.dropdownContainer)}>
              <TabListDropdown
                dropdownId={dropdownId}
                hiddenTabs={hiddenTabs}
                overflow={{
                  hiddenTabsCount,
                  isActiveTabHidden,
                }}
                activeTabId={activeTabId || ''}
                loading={loading}
                onTabSelect={handleSelectTabFromDropdown}
              />
            </div>
          )}

          {addTabStrategy?.mode === 'direct' && (
            <div
              {...stylex.props(
                styles.addButton,
                styles.addButtonGap(TAB_LIST_GAP),
              )}
            >
              <TabButton
                startIcon={<IconPlus />}
                onClick={() => addTabStrategy.onCreate()}
              >
                {t`New Tab`}
              </TabButton>
            </div>
          )}
          {addTabStrategy?.mode === 'dropdown' && (
            <div
              {...stylex.props(
                styles.addButton,
                styles.addButtonGap(TAB_LIST_GAP),
              )}
            >
              <DropdownRoot dropdownId={addTabDropdownId} type="menu">
                <Dropdown.Trigger
                  render={
                    <TabButton startIcon={<IconPlus />}>{t`New Tab`}</TabButton>
                  }
                />
                <DropdownContent>
                  <PageLayoutTabListNewTabDropdownContent
                    onCreate={addTabStrategy.onCreate}
                  />
                </DropdownContent>
              </DropdownRoot>
            </div>
          )}
        </div>
      </NodeDimension>
    </TabListComponentInstanceContext.Provider>
  );
};
