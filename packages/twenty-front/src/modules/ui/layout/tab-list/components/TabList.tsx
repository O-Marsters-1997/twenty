import { TabListHiddenMeasurements } from '@/ui/layout/tab-list/components/TabListHiddenMeasurements';
import { useScrollActiveTabIntoView } from '@/ui/layout/tab-list/hooks/useScrollActiveTabIntoView';
import { useTabListMeasurements } from '@/ui/layout/tab-list/hooks/useTabListMeasurements';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { TabListComponentInstanceContext } from '@/ui/layout/tab-list/states/contexts/TabListComponentInstanceContext';
import { type TabListProps } from '@/ui/layout/tab-list/types/TabListProps';
import { NodeDimension } from '@/ui/utilities/dimensions/components/NodeDimension';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { useIsMobile } from 'twenty-ui/utilities';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { TabListRow } from '@/ui/layout/tab-list/components/TabListRow';
import { TabListItem } from '@/ui/layout/tab-list/components/TabListItem';
import { TabListDropdown } from './TabListDropdown';
import { TabListSelectionSyncEffect } from '@/ui/layout/tab-list/components/TabListSelectionSyncEffect';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    position: 'relative',
    userSelect: 'none',
    height: spacing['--t-spacing-10'],
    width: '100%',
    '::after': {
      backgroundColor: borderColor['--t-border-color-light'],
      bottom: 0,
      content: '""',
      height: '1px',
      left: 0,
      position: 'absolute',
      right: 0,
    },
  },
  innerContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  innerContainerCentered: {
    justifyContent: 'center',
  },
  nodeDimension: {
    flex: 1,
    display: 'flex',
    minWidth: 0,
  },
  dropdownContainer: {
    alignItems: 'center',
    display: 'flex',
  },
  rightContainer: {
    alignItems: 'center',
    display: 'flex',
    marginLeft: 'auto',
  },
});

export const TabList = ({
  'aria-label': ariaLabel,
  tabs,
  loading,
  behaveAsLinks = true,
  className,
  componentInstanceId,
  defaultActiveTabId,
  onChangeTab,
  onClickTab,
  rightComponent,
  centerTabs = false,
}: TabListProps) => {
  const visibleTabs = tabs.filter((tab) => !tab.hide);
  const location = useLocation();
  const navigate = useNavigate();
  const workspaceSurface = useWorkspaceSurface();
  const isMobile = useIsMobile();

  const [activeTabId, setActiveTabId] = useAtomComponentState(
    activeTabIdComponentState,
    componentInstanceId,
  );

  const activeTabExists = visibleTabs.some((tab) => tab.id === activeTabId);
  const routeTabId = location.hash.replace('#', '');
  const shouldSelectRouteTab =
    behaveAsLinks &&
    workspaceSurface.ownsRouteLocation &&
    visibleTabs.some((tab) => tab.id === routeTabId);
  const defaultTabId =
    visibleTabs.find((tab) => tab.id === defaultActiveTabId)?.id ??
    visibleTabs[0]?.id ??
    null;
  const nextActiveTabId = shouldSelectRouteTab
    ? routeTabId
    : activeTabExists
      ? activeTabId
      : defaultTabId;

  const {
    visibleTabCount,
    hiddenTabs,
    hiddenTabsCount,
    hasHiddenTabs,
    onTabWidthChange,
    onContainerWidthChange,
    onMoreButtonWidthChange,
  } = useTabListMeasurements({
    visibleTabs,
    hasAddButton: false,
  });

  const shouldScrollTabs = isMobile;
  const renderedTabs = shouldScrollTabs
    ? visibleTabs
    : visibleTabs.slice(0, visibleTabCount);
  const shouldShowOverflowDropdown = hasHiddenTabs && !shouldScrollTabs;

  const { tabRowRef } = useScrollActiveTabIntoView({
    activeTabId,
    isScrollable: shouldScrollTabs,
  });

  const dropdownId = `tab-overflow-${componentInstanceId}`;

  const isActiveTabHidden = useMemo(() => {
    if (!hasHiddenTabs) return false;
    return hiddenTabs.some((tab) => tab.id === activeTabId);
  }, [hasHiddenTabs, hiddenTabs, activeTabId]);

  const handleTabSelect = useCallback(
    (tabId: string) => {
      onClickTab?.(tabId);

      if (tabId === activeTabId) {
        return;
      }

      setActiveTabId(tabId);
      onChangeTab?.(tabId);
    },
    [activeTabId, setActiveTabId, onChangeTab, onClickTab],
  );

  const handleTabSelectFromDropdown = useCallback(
    (tabId: string) => {
      if (behaveAsLinks) {
        navigate(
          { search: location.search, hash: `#${tabId}` },
          {
            replace: workspaceSurface.type === 'side-panel',
            state: location.state,
          },
        );
      }

      handleTabSelect(tabId);
    },
    [
      behaveAsLinks,
      handleTabSelect,
      location.search,
      location.state,
      navigate,
      workspaceSurface.type,
    ],
  );

  const containerProps = stylex.props(styles.container);

  if (visibleTabs.length === 0) {
    return (
      <TabListSelectionSyncEffect
        componentInstanceId={componentInstanceId}
        nextActiveTabId={null}
        onChangeTab={onChangeTab}
      />
    );
  }

  return (
    <TabListComponentInstanceContext.Provider
      value={{ instanceId: componentInstanceId }}
    >
      <>
        <TabListSelectionSyncEffect
          componentInstanceId={componentInstanceId}
          nextActiveTabId={nextActiveTabId}
          onChangeTab={onChangeTab}
        />

        {visibleTabs.length > 1 && !shouldScrollTabs && (
          <TabListHiddenMeasurements
            visibleTabs={visibleTabs}
            activeTabId={activeTabId}
            loading={loading}
            onTabWidthChange={onTabWidthChange}
            onMoreButtonWidthChange={onMoreButtonWidthChange}
          />
        )}

        <div
          {...containerProps}
          className={[containerProps.className, className].join(' ')}
        >
          <NodeDimension
            className={stylex.props(styles.nodeDimension).className}
            onDimensionChange={onContainerWidthChange}
          >
            <div
              {...stylex.props(
                styles.innerContainer,
                centerTabs &&
                  !shouldScrollTabs &&
                  styles.innerContainerCentered,
              )}
            >
              <TabListRow
                aria-label={ariaLabel}
                ref={tabRowRef}
                behaveAsLinks={behaveAsLinks}
                isScrollable={shouldScrollTabs}
              >
                {renderedTabs.map((tab) => (
                  <TabListItem
                    key={tab.id}
                    tab={tab}
                    mode={behaveAsLinks ? 'link' : 'tab'}
                    active={tab.id === activeTabId}
                    disabled={tab.disabled ?? loading}
                    onSelect={handleTabSelect}
                  />
                ))}
              </TabListRow>

              {shouldShowOverflowDropdown && (
                <div {...stylex.props(styles.dropdownContainer)}>
                  <TabListDropdown
                    dropdownId={dropdownId}
                    overflow={{
                      hiddenTabsCount,
                      isActiveTabHidden,
                    }}
                    hiddenTabs={hiddenTabs}
                    activeTabId={activeTabId || ''}
                    onTabSelect={handleTabSelectFromDropdown}
                    loading={loading}
                  />
                </div>
              )}
            </div>
          </NodeDimension>

          {isDefined(rightComponent) && (
            <div {...stylex.props(styles.rightContainer)}>{rightComponent}</div>
          )}
        </div>
      </>
    </TabListComponentInstanceContext.Provider>
  );
};
