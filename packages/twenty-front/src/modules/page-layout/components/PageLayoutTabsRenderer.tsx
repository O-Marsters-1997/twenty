import { TabListRoot } from '@/ui/layout/tab-list/components/TabListRoot';
import { Tabs } from 'twenty-ui/primitives/navigation';
import { PageLayoutWidgetDndProvider } from '@/page-layout/components/dnd/PageLayoutWidgetDndProvider';
import { PageLayoutLeftPanel } from '@/page-layout/components/PageLayoutLeftPanel';
import { PageLayoutPrerenderedTabIdsResetEffect } from '@/page-layout/components/PageLayoutPrerenderedTabIdsResetEffect';
import { PageLayoutRecordIdentifierBar } from '@/page-layout/components/PageLayoutRecordIdentifierBar';
import { PageLayoutScrollResetEffect } from '@/page-layout/components/PageLayoutScrollResetEffect';
import { PageLayoutTabList } from '@/page-layout/components/PageLayoutTabList';
import { PageLayoutTabListEffect } from '@/page-layout/components/PageLayoutTabListEffect';
import { useCurrentPageLayoutOrThrow } from '@/page-layout/hooks/useCurrentPageLayoutOrThrow';
import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { usePageLayoutAddTabStrategy } from '@/page-layout/hooks/usePageLayoutAddTabStrategy';
import { usePageLayoutRenderableTabs } from '@/page-layout/hooks/usePageLayoutRenderableTabs';
import { PageLayoutMainContent } from '@/page-layout/PageLayoutMainContent';
import { pageLayoutPrerenderedTabIdsComponentState } from '@/page-layout/states/pageLayoutPrerenderedTabIdsComponentState';
import { getScrollWrapperInstanceIdFromPageLayoutAndRecord } from '@/page-layout/utils/getScrollWrapperInstanceIdFromPageLayoutAndRecord';
import { getTabListInstanceIdFromPageLayoutAndRecord } from '@/page-layout/utils/getTabListInstanceIdFromPageLayoutAndRecord';
import { shouldEnableTabEditingFeatures } from '@/page-layout/utils/shouldEnableTabEditingFeatures';
import { shouldPrerenderPageLayoutTab } from '@/page-layout/utils/shouldPrerenderPageLayoutTab';
import { sortTabsByPosition } from '@/page-layout/utils/sortTabsByPosition';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { useIsMobile } from 'twenty-ui/utilities';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutType } from '~/generated-metadata/graphql';
import { media } from 'twenty-ui/theme/constants.stylex';
import '~/third-party-styles/page-layout.css';
import * as stylex from '@stylexjs/stylex';

export const PageLayoutTabsRenderer = () => {
  const workspaceSurface = useWorkspaceSurface();
  const { currentPageLayout } = useCurrentPageLayoutOrThrow();

  const { layoutType, targetRecordIdentifier, isRecordIdentifierBarHidden } =
    useLayoutRenderingContext();

  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const isMobile = useIsMobile();

  const activeTabId = useAtomComponentStateValue(activeTabIdComponentState);

  const scrollWrapperInstanceId = useWorkspaceSurfaceScopedComponentInstanceId(
    getScrollWrapperInstanceIdFromPageLayoutAndRecord({
      pageLayoutId: currentPageLayout.id,
      layoutType,
      targetRecordIdentifier,
      scrollWrapperArea: 'tab-content',
    }),
  );

  const tabListInstanceId = useWorkspaceSurfaceScopedComponentInstanceId(
    getTabListInstanceIdFromPageLayoutAndRecord({
      pageLayoutId: currentPageLayout.id,
      layoutType,
      targetRecordIdentifier,
    }),
  );

  const addTabStrategy = usePageLayoutAddTabStrategy({
    pageLayoutId: currentPageLayout.id,
    tabListInstanceId,
  });

  const canEnableTabEditing =
    isPageLayoutInEditMode &&
    shouldEnableTabEditingFeatures(currentPageLayout.type);

  const { tabsToRenderInTabList, pinnedLeftTab } =
    usePageLayoutRenderableTabs();

  const sortedTabs = sortTabsByPosition(tabsToRenderInTabList);

  const activeTabExistsInRenderableTabs = sortedTabs.some(
    (tab) => tab.id === activeTabId,
  );

  const pageLayoutPrerenderedTabIds = useAtomComponentStateValue(
    pageLayoutPrerenderedTabIdsComponentState,
  );

  const tabsToMount = sortedTabs.filter(
    (tab) =>
      tab.id === activeTabId ||
      (!isPageLayoutInEditMode &&
        pageLayoutPrerenderedTabIds.includes(tab.id) &&
        shouldPrerenderPageLayoutTab({
          tab,
          pageLayoutType: currentPageLayout.type,
        })),
  );

  const shouldRenderRecordIdentifierBar =
    currentPageLayout.type === PageLayoutType.RECORD_PAGE &&
    isDefined(targetRecordIdentifier) &&
    isRecordIdentifierBarHidden !== true &&
    workspaceSurface.type !== 'side-panel' &&
    !isMobile;

  const shouldRenderTabList = sortedTabs.length > 1 || isPageLayoutInEditMode;
  const behaveAsLinks =
    workspaceSurface.type === 'main' && !isPageLayoutInEditMode;
  const hasTabPanels = shouldRenderTabList && !behaveAsLinks;

  const tabList = shouldRenderTabList && (
    <PageLayoutTabList
      aria-label={currentPageLayout.name}
      className="page-layout-tab-list-print-hidden"
      presentation={
        shouldRenderRecordIdentifierBar ? 'identifier-bar' : 'standalone'
      }
      centerTabs={shouldRenderRecordIdentifierBar && !isDefined(pinnedLeftTab)}
      tabs={sortedTabs}
      behaveAsLinks={behaveAsLinks}
      componentInstanceId={tabListInstanceId}
      addTabStrategy={addTabStrategy}
      isReorderEnabled={canEnableTabEditing}
      pageLayoutType={currentPageLayout.type}
    />
  );

  return (
    <PageLayoutWidgetDndProvider>
      <PageLayoutScrollResetEffect
        pageLayoutTabId={activeTabId}
        scrollWrapperInstanceId={scrollWrapperInstanceId}
        targetRecordId={targetRecordIdentifier?.id}
      />
      <PageLayoutPrerenderedTabIdsResetEffect />
      <TabListRoot
        componentInstanceId={tabListInstanceId}
        enabled={hasTabPanels}
      >
        <div {...stylex.props(styles.root)}>
          {shouldRenderRecordIdentifierBar && (
            <PageLayoutRecordIdentifierBar
              targetRecordIdentifier={targetRecordIdentifier}
              pinnedTab={pinnedLeftTab}
              isPinnedTabEditable={isPageLayoutInEditMode}
              tabList={tabList}
            />
          )}

          <div
            data-page-layout-tabs-container=""
            {...stylex.props(
              styles.container,
              isDefined(pinnedLeftTab) && styles.containerWithPinnedTab,
            )}
          >
            {isDefined(pinnedLeftTab) && (
              <PageLayoutLeftPanel
                pageLayoutId={currentPageLayout.id}
                pinnedLeftTabId={pinnedLeftTab.id}
              />
            )}

            <div {...stylex.props(styles.tabsAndDashboard)}>
              <PageLayoutTabListEffect
                isInEditMode={isPageLayoutInEditMode}
                tabs={sortedTabs}
                componentInstanceId={tabListInstanceId}
                defaultTabToFocusOnMobileAndSidePanelId={
                  currentPageLayout.defaultTabToFocusOnMobileAndSidePanelId ??
                  undefined
                }
              />
              {!shouldRenderRecordIdentifierBar && tabList}

              <div
                data-page-layout-scroll-container=""
                {...stylex.props(styles.scrollWrapperContainer)}
              >
                <ScrollWrapper
                  className="page-layout-scroll-wrapper"
                  componentInstanceId={scrollWrapperInstanceId}
                  defaultEnableXScroll={false}
                >
                  {isDefined(activeTabId) &&
                    activeTabExistsInRenderableTabs &&
                    tabsToMount.map((tab) =>
                      hasTabPanels ? (
                        <Tabs.Panel
                          key={tab.id}
                          value={tab.id}
                          keepMounted
                          render={<div {...stylex.props(styles.tabPanel)} />}
                        >
                          <PageLayoutMainContent tabId={tab.id} />
                        </Tabs.Panel>
                      ) : (
                        <div
                          key={tab.id}
                          {...stylex.props(
                            tab.id === activeTabId
                              ? styles.tabContentActive
                              : styles.tabContentInactive,
                          )}
                        >
                          <PageLayoutMainContent tabId={tab.id} />
                        </div>
                      ),
                    )}
                </ScrollWrapper>
              </div>
            </div>
          </div>
        </div>
      </TabListRoot>
    </PageLayoutWidgetDndProvider>
  );
};

const styles = stylex.create({
  root: {
    display: { default: 'flex', [media.print]: 'block' },
    flexDirection: 'column',
    height: { default: '100%', [media.print]: 'auto' },
    minHeight: 0,
    width: '100%',
  },
  container: {
    display: { default: 'grid', [media.print]: 'block' },
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'minmax(0, 1fr)',
    height: { default: null, [media.print]: 'auto' },
    minHeight: 0,
    width: '100%',
  },
  containerWithPinnedTab: {
    gridTemplateColumns: '348px 1fr',
  },
  tabsAndDashboard: {
    display: { default: 'flex', [media.print]: 'block' },
    flexDirection: 'column',
    overflow: { default: 'hidden', [media.print]: 'visible' },
  },
  tabContentActive: { display: 'contents' },
  tabContentInactive: { display: 'none' },
  tabPanel: {
    alignItems: 'start',
    display: { default: null, ':not([hidden])': 'grid' },
    minHeight: '100%',
  },
  scrollWrapperContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minHeight: { default: 0, [media.print]: 'auto' },
  },
});
