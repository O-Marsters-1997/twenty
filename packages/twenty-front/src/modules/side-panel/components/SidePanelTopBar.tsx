import { SidePanelBackButton } from '@/side-panel/components/SidePanelBackButton';
import { SidePanelCloseButton } from '@/side-panel/components/SidePanelCloseButton';
import { SidePanelPageInfo } from '@/side-panel/components/SidePanelPageInfo';
import { SidePanelTopBarEscapeHotkeyEffect } from '@/side-panel/components/SidePanelTopBarEscapeHotkeyEffect';
import { SidePanelTopBarInputFocusEffect } from '@/side-panel/components/SidePanelTopBarInputFocusEffect';
import { SidePanelExpandButton } from '@/side-panel/components/SidePanelExpandButton';
import { SidePanelTopBarRightCornerIcon } from '@/side-panel/components/SidePanelTopBarRightCornerIcon';
import { COMMAND_MENU_SIDE_PANEL_PAGES } from '@/side-panel/constants/CommandMenuSidePanelPages';
import { SIDE_PANEL_FOCUS_ID } from '@/side-panel/constants/SidePanelFocusId';
import { SIDE_PANEL_TOP_BAR_HEIGHT } from '@/side-panel/constants/SidePanelTopBarHeight';
import { SIDE_PANEL_TOP_BAR_HEIGHT_MOBILE } from '@/side-panel/constants/SidePanelTopBarHeightMobile';
import { useHandleSidePanelBackspace } from '@/side-panel/hooks/useHandleSidePanelBackspace';
import { useHandleSidePanelEscape } from '@/side-panel/hooks/useHandleSidePanelEscape';
import { useSidePanelContextChips } from '@/side-panel/hooks/useSidePanelContextChips';
import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import { headerTitlePortalMarker } from '@/side-panel/components/SidePanelTopBar.stylex';
import { useLingui } from '@lingui/react/macro';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useRef } from 'react';
import { Key } from 'ts-key-enum';
import { SidePanelPages } from 'twenty-shared/types';
import { useIsMobile } from 'twenty-ui/utilities';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  inputContainer: (height: number) => ({
    margin: 0,
    borderRadius: 0,
    gap: spacing['--t-spacing-4'],
    outline: 'none',
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-lg'],
    justifyContent: 'space-between',
    position: 'relative',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: `${height}px`,
  }),
  headerTitlePortal: {
    flex: {
      default: null,
      ':not(:empty)': '1',
    },
    alignItems: 'center',
    display: {
      default: 'none',
      ':not(:empty)': 'flex',
    },
    minWidth: 0,
  },
  pageInfo: {
    display: {
      default: null,
      [stylex.when.siblingBefore(':not(:empty)', headerTitlePortalMarker)]:
        'none',
    },
  },
  input: {
    borderStyle: 'none',
    flex: '1',
    outline: 'none',
    backgroundColor: 'transparent',
    color: {
      default: fontColor['--t-font-color-primary'],
      '::placeholder': fontColor['--t-font-color-light'],
    },
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: {
      default: null,
      '::placeholder': fontWeight['--t-font-weight-medium'],
    },
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '0',
    borderTopLeftRadius: '0',
    borderTopRightRadius: '0',
    height: '24px',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
  },
  contentContainer: {
    flex: '1',
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  headerTitleContainer: {
    flex: '1',
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  headerActionsPortal: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
  rightControlsContainer: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
  },
});

export const SidePanelTopBar = ({
  setHeaderTitlePortal,
  setHeaderActionsPortal,
}: {
  setHeaderTitlePortal?: (element: HTMLElement | null) => void;
  setHeaderActionsPortal?: (element: HTMLElement | null) => void;
}) => {
  const [sidePanelSearch, setSidePanelSearch] =
    useAtomState(sidePanelSearchState);
  const inputRef = useRef<HTMLInputElement>(null);

  const { t } = useLingui();

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSidePanelSearch(event.target.value);
  };

  const isMobile = useIsMobile();

  const sidePanelNavigationStack = useAtomStateValue(
    sidePanelNavigationStackState,
  );
  const sidePanelPage =
    sidePanelNavigationStack.at(-1)?.page ?? SidePanelPages.CommandMenuDisplay;

  const theme = useTheme();

  const { contextChips } = useSidePanelContextChips();

  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();
  const handleSidePanelBackspace = useHandleSidePanelBackspace();
  const handleSidePanelEscape = useHandleSidePanelEscape();

  const handleInputFocus = () => {
    pushFocusItemToFocusStack({
      focusId: SIDE_PANEL_FOCUS_ID,
      component: {
        type: FocusComponentType.TEXT_INPUT,
        instanceId: SIDE_PANEL_FOCUS_ID,
      },
      globalHotkeysConfig: {
        enableGlobalHotkeysConflictingWithKeyboard: false,
      },
    });
  };

  const handleInputBlur = () => {
    removeFocusItemFromFocusStackById({
      focusId: SIDE_PANEL_FOCUS_ID,
    });
  };

  const handleInputKeyDownCapture = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return;
    }

    if (event.key === Key.Escape) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();

      handleSidePanelEscape();
      return;
    }

    if (
      event.key === Key.Backspace &&
      !event.metaKey &&
      !event.ctrlKey &&
      handleSidePanelBackspace()
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
    }
  };

  const currentPage = sidePanelNavigationStack.at(-1)?.page;
  const previousPage = sidePanelNavigationStack.at(-2)?.page;

  const canGoBack =
    currentPage !== undefined &&
    COMMAND_MENU_SIDE_PANEL_PAGES.includes(currentPage)
      ? previousPage !== undefined &&
        COMMAND_MENU_SIDE_PANEL_PAGES.includes(previousPage)
      : sidePanelNavigationStack.length > 1;

  const shouldShowBackButton = canGoBack;

  const shouldHideCloseButton = isMobile && shouldShowBackButton;

  const lastChip = contextChips.at(-1);

  return (
    <div
      {...stylex.props(
        styles.inputContainer(
          isMobile
            ? SIDE_PANEL_TOP_BAR_HEIGHT_MOBILE
            : SIDE_PANEL_TOP_BAR_HEIGHT,
        ),
      )}
    >
      <SidePanelTopBarEscapeHotkeyEffect
        inputRef={inputRef}
        onEscape={handleSidePanelEscape}
      />
      <div {...stylex.props(styles.contentContainer)}>
        <AnimatePresence>
          {shouldShowBackButton && (
            <motion.div
              key="side-panel-back-button"
              exit={{ opacity: 0, width: 0 }}
              transition={{
                duration: theme.animation.duration.instant,
              }}
            >
              <SidePanelBackButton />
            </motion.div>
          )}
        </AnimatePresence>
        {!COMMAND_MENU_SIDE_PANEL_PAGES.includes(sidePanelPage) && (
          <div {...stylex.props(styles.headerTitleContainer)}>
            <div
              ref={setHeaderTitlePortal}
              {...stylex.props(
                headerTitlePortalMarker,
                styles.headerTitlePortal,
              )}
            />
            {lastChip && (
              <div {...stylex.props(styles.pageInfo)}>
                <SidePanelPageInfo pageChip={lastChip} />
              </div>
            )}
          </div>
        )}
        {COMMAND_MENU_SIDE_PANEL_PAGES.includes(sidePanelPage) && (
          <>
            <input
              data-testid={SIDE_PANEL_FOCUS_ID}
              ref={inputRef}
              value={sidePanelSearch}
              placeholder={t`Type anything...`}
              onChange={handleSearchChange}
              onKeyDownCapture={handleInputKeyDownCapture}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              {...stylex.props(styles.input)}
            />
            <SidePanelTopBarInputFocusEffect inputRef={inputRef} />
          </>
        )}
      </div>
      <div {...stylex.props(styles.rightControlsContainer)}>
        <div
          ref={setHeaderActionsPortal}
          {...stylex.props(styles.headerActionsPortal)}
        />
        {sidePanelPage !== SidePanelPages.RoutedPage && (
          <SidePanelTopBarRightCornerIcon />
        )}
        <SidePanelExpandButton />
        {shouldHideCloseButton ? null : <SidePanelCloseButton />}
      </div>
    </div>
  );
};
