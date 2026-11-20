import { formatShortcut } from 'twenty-ui/primitives/typography';
import { SIDE_PANEL_TOP_BAR_HEIGHT_MOBILE } from '@/side-panel/constants/SidePanelTopBarHeightMobile';
import { COMMAND_MENU_SIDE_PANEL_PAGES } from '@/side-panel/constants/CommandMenuSidePanelPages';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';
import { PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID } from '@/ui/layout/page-header/constants/PageHeaderSidePanelButtonClickOutsideId';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { SidePanelPages } from 'twenty-shared/types';
import { IconDotsVertical } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useIsMobile } from 'twenty-ui/utilities';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  wrapper: {
    display: 'block',
  },
  wrapperAlignedToTop: (height: number, zIndex: number) => ({
    alignItems: 'center',
    display: 'flex',
    position: 'fixed',
    zIndex,
    height: `${height}px`,
    right: spacing['--t-spacing-3'],
    top: 0,
  }),
});

export const SidePanelToggleButton = () => {
  const { openSidePanelMenu } = useSidePanelMenu();
  const isSidePanelOpened = useAtomStateValue(isSidePanelOpenedState);
  const sidePanelNavigationStack = useAtomStateValue(
    sidePanelNavigationStackState,
  );
  const sidePanelPage =
    sidePanelNavigationStack.at(-1)?.page ?? SidePanelPages.CommandMenuDisplay;
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );

  const isMobile = useIsMobile();

  const isCommandMenuOpened =
    isSidePanelOpened && COMMAND_MENU_SIDE_PANEL_PAGES.includes(sidePanelPage);

  const alignWithSidePanelTopBar =
    isMobile && isLayoutCustomizationModeEnabled && isSidePanelOpened;

  const hasCommandMenuPageInNavigationStack = sidePanelNavigationStack.some(
    ({ page }) => COMMAND_MENU_SIDE_PANEL_PAGES.includes(page),
  );

  const isCoveredBySidePanelOnMobile =
    isMobile && isSidePanelOpened && !alignWithSidePanelTopBar;

  const shouldHideButton =
    isCommandMenuOpened ||
    (isSidePanelOpened && hasCommandMenuPageInNavigationStack) ||
    isCoveredBySidePanelOnMobile;

  if (shouldHideButton) {
    return null;
  }

  const ariaLabel = t`Command Menu`;
  const tooltipContent = t`Command menu | ${formatShortcut({ shortcut: ['Mod', 'K'] })}`;

  return (
    <div
      {...stylex.props(
        alignWithSidePanelTopBar
          ? styles.wrapperAlignedToTop(
              SIDE_PANEL_TOP_BAR_HEIGHT_MOBILE,
              RootStackingContextZIndices.SidePanelButton,
            )
          : styles.wrapper,
      )}
    >
      <Tooltip
        content={tooltipContent}
        delay={TooltipDelay.longDelay}
        side="bottom"
        sideOffset={5}
      >
        <div
          id="toggle-side-panel-button"
          data-click-outside-id={PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID}
        >
          <IconButton
            data-testid="page-header-side-panel-button"
            size="sm"
            variant="outline"
            color="neutral"
            aria-label={ariaLabel}
            onClick={openSidePanelMenu}
          >
            <IconDotsVertical />
          </IconButton>
        </div>
      </Tooltip>
    </div>
  );
};
