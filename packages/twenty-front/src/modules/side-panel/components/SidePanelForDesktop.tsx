import { isResizablePanelDraggingState } from '@/ui/layout/resizable-panel/states/isResizablePanelDraggingState';
import { SidePanelAskAiHandoffEffect } from '@/side-panel/components/SidePanelAskAiHandoffEffect';
import { SidePanelRouter } from '@/side-panel/components/SidePanelRouter';
import { SidePanelWidthEffect } from '@/side-panel/components/SidePanelWidthEffect';
import { SIDE_PANEL_CLICK_OUTSIDE_ID } from '@/side-panel/constants/SidePanelClickOutsideId';
import { SIDE_PANEL_CONSTRAINTS } from '@/side-panel/constants/SidePanelConstraints';
import { useSidePanelCloseAnimationCompleteCleanup } from '@/side-panel/hooks/useSidePanelCloseAnimationCompleteCleanup';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { isSidePanelClosingState } from '@/side-panel/states/isSidePanelClosingState';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import {
  SIDE_PANEL_WIDTH_VAR,
  sidePanelWidthState,
} from '@/side-panel/states/sidePanelWidthState';
import { DialogContainerContext } from '@/ui/layout/dialog/contexts/DialogContainerContext';
import { ResizeHandle } from 'twenty-ui/primitives/layout';
import { useLingui } from '@lingui/react/macro';
import { getUiZoom } from '@/ui/theme/utils/getUiZoom';
import { ParentClickOutsideIdContext } from '@/ui/utilities/pointer-event/contexts/ParentClickOutsideIdContext';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useReducedMotion } from 'framer-motion';
import { useStore } from 'jotai';
import { type AnimationEvent, useCallback, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  background,
  borderColor,
} from 'twenty-ui/theme/tokens.stylex';

const SIDE_PANEL_WIDTH = `var(${SIDE_PANEL_WIDTH_VAR})`;

const shrinkFromFullWidth = stylex.keyframes({
  from: { width: '100%' },
});

const styles = stylex.create({
  wrapper: {
    overflow: 'hidden',
    flexShrink: 0,
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'width',
    minWidth: 0,
  },
  wrapperResizing: {
    transitionProperty: 'none',
  },
  wrapperClosed: {
    width: '0px',
  },
  width: (width: string) => ({
    width,
  }),
  wrapperShrinking: {
    animationDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    animationName: shrinkFromFullWidth,
  },
  panel: {
    overflow: 'hidden',
    backgroundColor: background['--t-background-primary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    borderLeftColor: borderColor['--t-border-color-medium'],
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
    height: '100%',
  },
  panelShrinking: {
    width: '100%',
  },
  modalContainer: {
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 1,
    height: '100%',
    left: '0',
    top: '0',
    width: '100%',
  },
});

export const SidePanelForDesktop = () => {
  const { t } = useLingui();
  const store = useStore();
  const isSidePanelOpened = useAtomStateValue(isSidePanelOpenedState);
  const [sidePanelWidth, setSidePanelWidth] = useAtomState(sidePanelWidthState);
  const { closeSidePanelMenu } = useSidePanelMenu();
  const { sidePanelCloseAnimationCompleteCleanup } =
    useSidePanelCloseAnimationCompleteCleanup();
  const shouldReduceMotion = useReducedMotion();

  const [modalContainer, setModalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const [shouldRenderContent, setShouldRenderContent] =
    useState(isSidePanelOpened);
  const [isShrinkingFromFullWidth, setIsShrinkingFromFullWidth] =
    useState(false);

  const handleContinueChatFromFullWidth = useCallback(() => {
    if (shouldReduceMotion === true) {
      return;
    }

    setIsShrinkingFromFullWidth(true);
  }, [shouldReduceMotion]);

  const setIsResizablePanelDragging = useSetAtomState(
    isResizablePanelDraggingState,
  );

  const shouldShowContent = isSidePanelOpened || shouldRenderContent;

  if (isSidePanelOpened && !shouldRenderContent) {
    setShouldRenderContent(true);
  }

  const handleTransitionEnd = () => {
    if (isSidePanelOpened) {
      return;
    }

    setShouldRenderContent(false);

    if (store.get(isSidePanelClosingState.atom)) {
      sidePanelCloseAnimationCompleteCleanup();
    }
  };

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    setIsShrinkingFromFullWidth(false);
    handleTransitionEnd();
  };

  const handleModalContainerRef = useCallback(
    (element: HTMLDivElement | null) => {
      setModalContainer(element);
    },
    [],
  );

  const handleWidthChange = useCallback(
    (width: number) => {
      setSidePanelWidth(width);
      setLiveWidth(null);
      setIsResizing(false);
      setIsResizablePanelDragging(false);
    },
    [setSidePanelWidth, setIsResizablePanelDragging],
  );

  const handleWidthPreview = (width: number) => {
    setLiveWidth(width);
    document.documentElement.style.setProperty(
      SIDE_PANEL_WIDTH_VAR,
      `${width}px`,
    );
  };

  const handleResizeEnd = () => {
    setLiveWidth(null);
    setIsResizing(false);
    setIsResizablePanelDragging(false);
  };

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    setIsResizablePanelDragging(true);
  }, [setIsResizablePanelDragging]);

  const handleCollapse = useCallback(() => {
    closeSidePanelMenu();
    setLiveWidth(null);
    setIsResizing(false);
    setIsResizablePanelDragging(false);
  }, [closeSidePanelMenu, setIsResizablePanelDragging]);

  return (
    <>
      <SidePanelWidthEffect />
      <SidePanelAskAiHandoffEffect
        onContinueChatFromFullWidth={handleContinueChatFromFullWidth}
      />
      {isSidePanelOpened && (
        <ResizeHandle
          edge="left"
          min={SIDE_PANEL_CONSTRAINTS.min}
          max={SIDE_PANEL_CONSTRAINTS.max}
          value={liveWidth ?? sidePanelWidth}
          onValueChange={handleWidthPreview}
          onValueCommitted={handleWidthChange}
          onActivate={handleCollapse}
          placement="gap"
          aria-label={t`Resize side panel`}
          scale={getUiZoom}
          onResizeEnd={handleResizeEnd}
          onResizeStart={handleResizeStart}
        />
      )}

      <div
        {...stylex.props(
          styles.wrapper,
          isResizing && styles.wrapperResizing,
          isSidePanelOpened
            ? styles.width(SIDE_PANEL_WIDTH)
            : styles.wrapperClosed,
          isShrinkingFromFullWidth && styles.wrapperShrinking,
        )}
        onTransitionEnd={handleTransitionEnd}
        onAnimationEnd={handleAnimationEnd}
        data-shrink-from-full-width={isShrinkingFromFullWidth}
        data-side-panel=""
        data-click-outside-id={SIDE_PANEL_CLICK_OUTSIDE_ID}
      >
        <aside
          {...stylex.props(
            styles.panel,
            isShrinkingFromFullWidth
              ? styles.panelShrinking
              : styles.width(SIDE_PANEL_WIDTH),
          )}
        >
          <div
            ref={handleModalContainerRef}
            {...stylex.props(styles.modalContainer)}
          />
          <DialogContainerContext.Provider
            value={{ container: modalContainer }}
          >
            <ParentClickOutsideIdContext.Provider
              value={SIDE_PANEL_CLICK_OUTSIDE_ID}
            >
              {shouldShowContent && <SidePanelRouter />}
            </ParentClickOutsideIdContext.Provider>
          </DialogContainerContext.Provider>
        </aside>
      </div>
    </>
  );
};
