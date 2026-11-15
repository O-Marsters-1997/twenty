import { t } from '@lingui/core/macro';
import { type ReactNode } from 'react';

import { NavigationDrawerCollapseButton } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerCollapseButton';

import { useIsSettingsPage } from '@/navigation/hooks/useIsSettingsPage';
import { useNavigationDrawerExpanded } from '@/ui/navigation/navigation-drawer/hooks/useNavigationDrawerExpanded';
import { PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID } from '@/ui/layout/page/constants/PageActionContainerClickOutsideId';
import { layoutSize } from '@/ui/layout/constants/layout.stylex';
import { useIsMobile } from 'twenty-ui/utilities';
import { AnimatePresence } from 'framer-motion';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type IconComponent, IconX } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  topBarContainer: {
    alignItems: 'center',
    backgroundColor: background['--t-background-noisy'],
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'row',
    fontSize: fontSize['--t-font-size-lg'],
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
    minHeight: layoutSize.pageBarMinHeight,
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
  },
  topBarContainerMobile: {
    paddingLeft: spacing['--t-spacing-3'],
  },
  leftContainer: {
    alignItems: 'center',
    display: 'flex',
    flex: '0 1 auto',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
    overflowX: 'hidden',
    paddingLeft: { default: null, [media.mobile]: spacing['--t-spacing-1'] },
  },
  titleContainer: {
    alignItems: 'center',
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginRight: spacing['--t-spacing-1'],
    overflow: 'hidden',
    width: '100%',
  },
  topBarIconStyledTitleContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    width: '100%',
  },
  pageActionContainer: {
    alignItems: 'center',
    display: 'flex',
    flex: '1 1 0',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'flex-end',
    minWidth: '0',
  },
  iconContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
});

type PageHeaderProps = {
  title?: ReactNode;
  hasClosePageButton?: boolean;
  onClosePage?: () => void;
  Icon?: IconComponent;
  children?: ReactNode;
  className?: string;
};

export const PageHeader = ({
  title,
  hasClosePageButton,
  onClosePage,
  Icon,
  children,
  className,
}: PageHeaderProps) => {
  const isMobile = useIsMobile();
  const isSettingsPage = useIsSettingsPage();
  const theme = useTheme();
  const isNavigationDrawerExpanded = useNavigationDrawerExpanded();

  const topBarProps = stylex.props(
    styles.topBarContainer,
    isMobile && styles.topBarContainerMobile,
  );

  return (
    <AnimatePresence initial={false}>
      <div
        {...topBarProps}
        className={[topBarProps.className, className].join(' ')}
      >
        <div {...stylex.props(styles.leftContainer)}>
          {!isNavigationDrawerExpanded && (!isMobile || isSettingsPage) && (
            <NavigationDrawerCollapseButton direction="right" />
          )}
          {hasClosePageButton && (
            <LightIconButton
              size="sm"
              emphasis="subtle"
              onClick={() => onClosePage?.()}
              aria-label={t`Close page`}
            >
              <IconX />
            </LightIconButton>
          )}

          <div {...stylex.props(styles.topBarIconStyledTitleContainer)}>
            {Icon && (
              <div {...stylex.props(styles.iconContainer)}>
                <Icon size={theme.icon.size.md} />
              </div>
            )}
            {isDefined(title) && (
              <div
                data-testid="top-bar-title"
                {...stylex.props(styles.titleContainer)}
              >
                {typeof title === 'string' ? (
                  <OverflowingTextWithTooltip text={title} />
                ) : (
                  title
                )}
              </div>
            )}
          </div>
        </div>
        <div
          data-click-outside-id={PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID}
          {...stylex.props(styles.pageActionContainer)}
        >
          {children}
        </div>
      </div>
    </AnimatePresence>
  );
};
