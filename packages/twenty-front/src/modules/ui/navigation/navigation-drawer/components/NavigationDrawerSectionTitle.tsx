import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import { sectionTitleMarker } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle.stylex';
import { useIsMobile } from 'twenty-ui/utilities';
import { motion } from 'framer-motion';
import React from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronRight } from 'twenty-ui/icon';
import { Text } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  title: {
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    cursor: {
      default: null,
      ':hover': 'pointer',
    },
    display: 'flex',
    height: spacing['--t-spacing-7'],
    justifyContent: 'space-between',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-0_5'],
    paddingTop: spacing['--t-spacing-1'],
  },
  labelContainer: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: '1',
    gap: spacing['--t-spacing-1'],
  },
  displayLabel: {
    color: {
      default: fontColor['--t-font-color-light'],
      [stylex.when.ancestor(':hover', sectionTitleMarker)]:
        fontColor['--t-font-color-tertiary'],
    },
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  chevron: {
    alignItems: 'center',
    display: 'flex',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', sectionTitleMarker)]: 1,
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease',
  },
  rightIcon: {
    cursor: 'pointer',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', sectionTitleMarker)]: 1,
    },
  },
  rightIconVisible: {
    opacity: 1,
  },
});

const MotionIconChevronRight = motion.create(IconChevronRight);

type NavigationDrawerSectionTitleProps = {
  onClick?: () => void;
  label: string;
  rightIcon?: React.ReactNode;
  alwaysShowRightIcon?: boolean;
  isOpen?: boolean;
};

export const NavigationDrawerSectionTitle = ({
  onClick,
  label,
  rightIcon,
  alwaysShowRightIcon = false,
  isOpen,
}: NavigationDrawerSectionTitleProps) => {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const isNavigationDrawerExpanded = useIsNavigationDrawerContentExpanded();
  const handleTitleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isDefined(onClick) && isNavigationDrawerExpanded) {
      onClick();
    }
  };

  return (
    <div {...stylex.props(sectionTitleMarker, styles.title)}>
      <div onClick={handleTitleClick} {...stylex.props(styles.labelContainer)}>
        <Text {...stylex.props(styles.displayLabel)}>{label}</Text>
        {isOpen !== undefined && (
          <div {...stylex.props(styles.chevron)}>
            <MotionIconChevronRight
              initial={false}
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: theme.animation.duration.normal }}
              size="12px"
              stroke={theme.icon.stroke.lg}
              color={theme.font.color.tertiary}
            />
          </div>
        )}
      </div>
      {isDefined(rightIcon) && (
        <div
          {...stylex.props(
            styles.rightIcon,
            (isMobile || alwaysShowRightIcon) && styles.rightIconVisible,
          )}
        >
          {rightIcon}
        </div>
      )}
    </div>
  );
};
