import { NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerCollapsedButtonSize';
import { useLingui } from '@lingui/react/macro';
import { motion, useReducedMotion } from 'framer-motion';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';

import { useAgentChatOpenThreadsSummary } from '@/ai/hooks/useAgentChatOpenThreadsSummary';
import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { useActiveNavigationDrawerMode } from '@/navigation/hooks/useActiveNavigationDrawerMode';
import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import { useNavigationDrawerModes } from '@/navigation/hooks/useNavigationDrawerModes';
import { useSwitchNavigationDrawerMode } from '@/navigation/hooks/useSwitchNavigationDrawerMode';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { StyledNavigationDrawerUnreadDot } from '@/ui/navigation/navigation-drawer/components/StyledNavigationDrawerUnreadDot';
import {
  type NavigationDrawerActiveTab,
  NAVIGATION_DRAWER_TABS,
} from '@/ui/navigation/states/navigationDrawerTabs';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey } from '~/generated-metadata/graphql';
import { useIsMobile } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  general,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  modeIcon: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    height: spacing['--t-spacing-4'],
    justifyContent: 'center',
    position: 'relative',
    width: spacing['--t-spacing-4'],
  },
  switcher: {
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: general['--t-between-siblings-gap'],
    minWidth: 0,
  },
  switcherExpanded: {
    alignItems: 'center',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    flexDirection: 'row',
    gap: spacing['--t-spacing-0_5'],
    height: spacing['--t-spacing-10'],
  },
  mode: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-md-round'],
    borderWidth: 0,
    color: fontColor['--t-font-color-tertiary'],
    cornerShape: 'round',
    cursor: 'pointer',
    display: 'flex',
    flexShrink: 0,
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: 0,
    justifyContent: 'center',
    minWidth: 0,
    padding: 0,
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s), calc(${animationDuration['--t-animation-duration-fast']} * 1s), calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'background, color, gap',
    transitionTimingFunction: 'ease',
  },
  modeCollapsedSize: (size: number) => ({
    height: `${size}px`,
    width: `${size}px`,
  }),
  modeExpanded: {
    borderRadius: borderRadius['--t-border-radius-sm-round'],
    height: spacing['--t-spacing-7'],
    justifyContent: 'flex-start',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-1_5'],
    width: 'auto',
  },
  modeActive: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    color: fontColor['--t-font-color-primary'],
  },
  modeActiveExpanded: {
    flexShrink: 1,
    gap: spacing['--t-spacing-1'],
  },
  modeHover: {
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
    color: { default: null, ':hover': fontColor['--t-font-color-primary'] },
  },
  modeHoverActive: {
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
  },
  modeDisabled: {
    color: fontColor['--t-font-color-light'],
    cursor: 'not-allowed',
  },
  modeLabel: {
    display: 'block',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export const MainNavigationDrawerModeSwitcher = () => {
  const { t } = useLingui();
  const theme = useTheme();

  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );
  const isMobile = useIsMobile();
  const isExpanded = useIsNavigationDrawerContentExpanded();
  const modes = useNavigationDrawerModes();
  const activeNavigationDrawerMode = useActiveNavigationDrawerMode();
  const { switchNavigationDrawerMode } = useSwitchNavigationDrawerMode();
  const shouldReduceMotion = useReducedMotion();
  const { hasUnreadOpenThread } = useAgentChatOpenThreadsSummary();
  const isAiChatInboxEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_AI_CHAT_INBOX_ENABLED,
  );

  const getDisabledModeTooltip = (mode: NavigationDrawerActiveTab) => {
    if (mode === NAVIGATION_DRAWER_TABS.SETTINGS) {
      return t`Finish editing the layout to open Settings`;
    }

    return isAiChatInboxEnabled
      ? t`Finish editing the layout to open Inbox`
      : t`Finish editing the layout to open AI`;
  };

  if (modes.length === 0) {
    return null;
  }

  const shouldShowTooltips = !isExpanded && !isMobile;

  return (
    <div
      {...stylex.props(styles.switcher, isExpanded && styles.switcherExpanded)}
      role="group"
      aria-label={t`Navigation modes`}
    >
      {modes.map(({ Icon, label, mode }) => {
        const isActive = mode === activeNavigationDrawerMode;
        // Inside the inbox, its Open item already shows what is unread
        const isUnread =
          isAiChatInboxEnabled &&
          mode === NAVIGATION_DRAWER_TABS.AI_CHAT_HISTORY &&
          hasUnreadOpenThread &&
          !isActive;
        const isDisabled =
          mode !== NAVIGATION_DRAWER_TABS.NAVIGATION_MENU &&
          isLayoutCustomizationModeEnabled;

        return (
          <Tooltip
            key={mode}
            content={isDisabled ? getDisabledModeTooltip(mode) : label}
            disabled={!shouldShowTooltips && !isDisabled}
            delay={TooltipDelay.noDelay}
            side={isExpanded ? 'bottom' : 'right'}
            positionMethod="fixed"
          >
            <button
              type="button"
              {...stylex.props(
                styles.mode,
                isExpanded
                  ? styles.modeExpanded
                  : styles.modeCollapsedSize(
                      NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE,
                    ),
                isActive && styles.modeActive,
                isActive && isExpanded && styles.modeActiveExpanded,
                !isDisabled && styles.modeHover,
                !isDisabled && isActive && styles.modeHoverActive,
                isDisabled && styles.modeDisabled,
              )}
              aria-label={isUnread ? t`${label}, unread` : label}
              aria-current={isActive}
              aria-disabled={isDisabled}
              onClick={() => {
                if (isDisabled) {
                  return;
                }

                switchNavigationDrawerMode(mode);
              }}
            >
              <span {...stylex.props(styles.modeIcon)}>
                <Icon size={theme.icon.size.md} />
                {isUnread && <StyledNavigationDrawerUnreadDot />}
              </span>
              <motion.span
                {...stylex.props(styles.modeLabel)}
                initial={false}
                animate={{ width: isExpanded && isActive ? 'auto' : 0 }}
                transition={{
                  duration: shouldReduceMotion
                    ? 0
                    : theme.animation.duration.normal,
                  ease: 'easeInOut',
                }}
              >
                {label}
              </motion.span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};
