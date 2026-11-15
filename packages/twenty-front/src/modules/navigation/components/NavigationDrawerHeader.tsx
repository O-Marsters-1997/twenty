import { APP_HEADER_HEIGHT } from '@/ui/layout/constants/AppHeaderHeight';
import { NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerCollapsedButtonSize';
import { t } from '@lingui/core/macro';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconSearch } from 'twenty-ui/icon';
import { MOBILE_VIEWPORT } from 'twenty-ui/theme';
import { media } from 'twenty-ui/theme/constants.stylex';

import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import { useOpenRecordsSearchPageInSidePanel } from '@/side-panel/hooks/useOpenRecordsSearchPageInSidePanel';
import { MultiWorkspaceDropdownButton } from '@/navigation/components/MultiWorkspaceDropdown/MultiWorkspaceDropdownButton';
import { useIsMobile } from 'twenty-ui/utilities';
import { NavigationDrawerCollapseButton } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerCollapseButton';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    flexShrink: '0',
    userSelect: 'none',
  },
  collapsedSearch: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  rightActions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    gap: spacing['--t-spacing-0_5'],
    marginLeft: 'auto',
  },
  workspaceDropdownContainer: {
    display: 'flex',
    flex: '1 1 auto',
    minWidth: '0',
  },
  headerRow: {
    alignItems: 'center',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    boxSizing: 'border-box',
    display: 'flex',
    paddingBlock: 0,
    paddingInline: {
      default: spacing['--t-spacing-2'],
      [media.mobile]: spacing['--t-spacing-7'],
    },
  },
  headerRowHeight: (height: number) => ({ height: `${height}px` }),
  searchButton: {
    height: spacing['--t-spacing-6'],
    width: spacing['--t-spacing-6'],
  },
  searchButtonSize: (size: number) => ({
    height: `${size}px`,
    width: `${size}px`,
  }),
  collapseButton: {
    height: spacing['--t-spacing-6'],
    paddingRight: 0,
    width: spacing['--t-spacing-6'],
  },
});

export const NavigationDrawerHeader = () => {
  const isMobile = useIsMobile();
  const { openRecordsSearchPage } = useOpenRecordsSearchPageInSidePanel();
  const isExpanded = useIsNavigationDrawerContentExpanded();

  const searchButton = !isMobile && (
    <LightIconButton
      {...stylex.props(
        isExpanded
          ? styles.searchButton
          : styles.searchButtonSize(NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE),
      )}
      emphasis="standard"
      size="sm"
      onClick={openRecordsSearchPage}
      aria-label={t`Search`}
    >
      <IconSearch />
    </LightIconButton>
  );

  return (
    <div {...stylex.props(styles.container)}>
      <div
        {...stylex.props(
          styles.headerRow,
          styles.headerRowHeight(APP_HEADER_HEIGHT),
        )}
      >
        <div {...stylex.props(styles.workspaceDropdownContainer)}>
          <MultiWorkspaceDropdownButton />
        </div>
        {isExpanded && (
          <div {...stylex.props(styles.rightActions)}>
            {searchButton}
            <NavigationDrawerCollapseButton
              direction="left"
              {...stylex.props(
                styles.collapseButton,
                isMobile &&
                  styles.searchButtonSize(
                    NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE,
                  ),
              )}
            />
          </div>
        )}
      </div>
      {!isExpanded && !isMobile && (
        <div {...stylex.props(styles.collapsedSearch)}>{searchButton}</div>
      )}
    </div>
  );
};
