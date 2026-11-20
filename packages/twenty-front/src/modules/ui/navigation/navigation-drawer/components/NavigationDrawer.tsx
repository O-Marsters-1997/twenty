import { type ReactNode, useRef, useState } from 'react';

import { useNavigationDrawerExpanded } from '@/ui/navigation/navigation-drawer/hooks/useNavigationDrawerExpanded';
import { isResizablePanelDraggingState } from '@/ui/layout/resizable-panel/states/isResizablePanelDraggingState';
import { ResizeHandle } from 'twenty-ui/primitives/layout';
import { useLingui } from '@lingui/react/macro';
import { getUiZoom } from '@/ui/theme/utils/getUiZoom';
import { NAVIGATION_DRAWER_CONSTRAINTS } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerConstraints';
import { NavigationDrawerWidthEffect } from '@/ui/navigation/components/NavigationDrawerWidthEffect';
import { NAVIGATION_DRAWER_CLICK_OUTSIDE_ID } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerClickOutsideId';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { navigationDrawerActiveTabState } from '@/ui/navigation/states/navigationDrawerActiveTabState';
import { NAVIGATION_DRAWER_TABS } from '@/ui/navigation/states/navigationDrawerTabs';
import {
  NAVIGATION_DRAWER_WIDTH_VAR,
  navigationDrawerWidthState,
} from '@/ui/navigation/states/navigationDrawerWidthState';
import { shouldFocusNavigationDrawerExpandButtonState } from '@/ui/navigation/navigation-drawer/states/shouldFocusNavigationDrawerExpandButtonState';
import { useIsMobile } from 'twenty-ui/utilities';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import * as stylex from '@stylexjs/stylex';
import { animationDuration, spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

export type NavigationDrawerProps = {
  children?: ReactNode;
  className?: string;
  header?: ReactNode;
};

const styles = stylex.create({
  animatedContainer: {
    overflow: 'clip',
    position: 'relative',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'width',
    height: '100%',
    maxHeight: '100%',
  },
  animatedContainerResizing: {
    transitionProperty: 'none',
  },
  animatedContainerExpanded: {
    width: {
      default: 'var(--navigation-drawer-width)',
      [media.mobile]: 'calc(100vw / var(--t-zoom, 1))',
    },
  },
  animatedContainerCollapsed: {
    width: {
      default: spacing['--t-spacing-12'],
      [media.mobile]: 0,
    },
  },
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingBottom: spacing['--t-spacing-4'],
    width: '100%',
  },
  containerExpanded: {
    width: {
      default: 'var(--navigation-drawer-width)',
      [media.mobile]: '100%',
    },
  },
  content: {
    flex: '1',
    gap: {
      default: spacing['--t-spacing-2'],
      [media.mobile]: spacing['--t-spacing-4'],
    },
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: { default: null, [media.mobile]: spacing['--t-spacing-2'] },
  },
});

export const NavigationDrawer = ({
  children,
  className,
  header,
}: NavigationDrawerProps) => {
  const { t } = useLingui();
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const isExpanded = useNavigationDrawerExpanded();

  const [isNavigationDrawerExpanded, setIsNavigationDrawerExpanded] =
    useAtomState(isNavigationDrawerExpandedState);
  const [navigationDrawerWidth, setNavigationDrawerWidth] = useAtomState(
    navigationDrawerWidthState,
  );
  const setNavigationDrawerActiveTab = useSetAtomState(
    navigationDrawerActiveTabState,
  );
  const setIsResizablePanelDragging = useSetAtomState(
    isResizablePanelDraggingState,
  );
  const setShouldFocusNavigationDrawerExpandButton = useSetAtomState(
    shouldFocusNavigationDrawerExpandButtonState,
  );

  const handleCollapse = () => {
    setShouldFocusNavigationDrawerExpandButton(
      resizeHandleRef.current === document.activeElement,
    );
    setIsNavigationDrawerExpanded(false);
    setLiveWidth(null);
    setNavigationDrawerActiveTab(NAVIGATION_DRAWER_TABS.NAVIGATION_MENU);
    setIsResizing(false);
    setIsResizablePanelDragging(false);
  };

  const handleWidthChange = (width: number) => {
    setNavigationDrawerWidth(width);
    setLiveWidth(null);
    setIsResizing(false);
    setIsResizablePanelDragging(false);
  };

  const handleWidthPreview = (width: number) => {
    setLiveWidth(width);
    document.documentElement.style.setProperty(
      NAVIGATION_DRAWER_WIDTH_VAR,
      `${width}px`,
    );
  };

  const handleResizeEnd = () => {
    setLiveWidth(null);
    setIsResizing(false);
    setIsResizablePanelDragging(false);
  };

  const handleResizeStart = () => {
    setIsResizing(true);
    setIsResizablePanelDragging(true);
  };

  const animatedContainerProps = stylex.props(
    styles.animatedContainer,
    isResizing && styles.animatedContainerResizing,
    isExpanded
      ? styles.animatedContainerExpanded
      : styles.animatedContainerCollapsed,
  );

  return (
    <>
      <NavigationDrawerWidthEffect />
      <div
        data-click-outside-id={NAVIGATION_DRAWER_CLICK_OUTSIDE_ID}
        {...animatedContainerProps}
        className={[animatedContainerProps.className, className].join(' ')}
      >
        <div
          {...stylex.props(
            styles.container,
            isExpanded && styles.containerExpanded,
          )}
        >
          {header}
          <div {...stylex.props(styles.content)}>{children}</div>
        </div>

        {isNavigationDrawerExpanded && !isMobile && (
          <ResizeHandle
            ref={resizeHandleRef}
            edge="right"
            min={NAVIGATION_DRAWER_CONSTRAINTS.min}
            max={NAVIGATION_DRAWER_CONSTRAINTS.max}
            value={liveWidth ?? navigationDrawerWidth}
            onValueChange={handleWidthPreview}
            onValueCommitted={handleWidthChange}
            onActivate={handleCollapse}
            children={null}
            aria-label={t`Resize navigation drawer`}
            scale={getUiZoom}
            onResizeEnd={handleResizeEnd}
            onResizeStart={handleResizeStart}
          />
        )}
      </div>
    </>
  );
};
