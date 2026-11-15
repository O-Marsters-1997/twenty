import * as stylex from '@stylexjs/stylex';
import { MobileNavigationBarScrollEffect } from '@/navigation/components/MobileNavigationBarScrollEffect';
import { MOBILE_NAVIGATION_BAR_PADDING } from '@/navigation/constants/MobileNavigationBarPadding';
import { useMobileNavigationBarItems } from '@/navigation/hooks/useMobileNavigationBarItems';
import { isMobileNavigationBarVisibleState } from '@/navigation/states/isMobileNavigationBarVisibleState';
import { isSidePanelOpenedState } from '@/side-panel/states/isSidePanelOpenedState';
import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLocation } from 'react-router-dom';
import { IconButton } from 'twenty-ui/components/input';
import { isAiChatPath } from '~/utils/isAiChatPath';
import {
  animationDuration,
  backgroundTransparent,
  blur,
  borderColor,
  borderRadius,
  boxShadow,
  grayScale,
  iconSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  floatingContainer: {
    bottom: 0,
    display: {
      default: 'flex',
      [media.print]: 'none',
    },
    justifyContent: 'flex-start',
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
  },
  floatingContainerLayout: (padding: string, zIndex: number) => ({
    paddingBottom: `calc(${padding} + env(safe-area-inset-bottom, 0px))`,
    paddingLeft: padding,
    paddingRight: padding,
    paddingTop: padding,
    zIndex,
  }),
  navigationBar: {
    alignItems: 'center',
    backdropFilter: blur['--t-blur-strong'],
    backgroundColor:
      backgroundTransparent['--t-background-transparent-primary'],
    borderColor: borderColor['--t-border-color-transparent-strong'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: boxShadow['--t-box-shadow-strong'],
    boxSizing: 'border-box',
    cornerShape: 'round',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'center',
    padding: spacing['--t-spacing-1'],
    pointerEvents: 'auto',
    transitionDuration: {
      default: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
      [media.reducedMotion]: '0s',
    },
    transitionProperty: 'opacity, transform, visibility',
    transitionTimingFunction: 'ease',
    width: 'max-content',
  },
  navigationBarHidden: {
    opacity: 0,
    pointerEvents: 'none',
    transform: `translateY(calc(100% + ${spacing['--t-spacing-4']}))`,
    visibility: 'hidden',
  },
  navigationButton: {
    '--tw-button-size': spacing['--t-spacing-10'],
    '--tw-icon-button-icon-size': iconSize['--t-icon-size-lg'],
    borderWidth: 0,
    color: grayScale['--t-gray-scale-gray10'],
    transitionDuration: {
      default: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
      [media.reducedMotion]: '0s',
    },
    transitionProperty: 'background-color',
    transitionTimingFunction: 'ease',
  },
  navigationButtonPressed: {
    backgroundColor: backgroundTransparent['--t-background-transparent-medium'],
  },
  navigationButtonHover: {
    backgroundColor: {
      default: null,
      [media.hoverCapable]: {
        default: null,
        ':hover': backgroundTransparent['--t-background-transparent-light'],
      },
    },
  },
});

export const MobileNavigationBar = () => {
  const { pathname } = useLocation();
  const isSidePanelOpened = useAtomStateValue(isSidePanelOpenedState);
  const isMobileNavigationBarVisible = useAtomStateValue(
    isMobileNavigationBarVisibleState,
  );
  const { items, activeItemName } = useMobileNavigationBarItems();

  // The chat page keeps the keyboard up and carries its own close button.
  const isHidden =
    isSidePanelOpened ||
    !isMobileNavigationBarVisible ||
    isAiChatPath(pathname);

  return (
    <>
      <MobileNavigationBarScrollEffect />
      <div
        {...stylex.props(
          styles.floatingContainer,
          styles.floatingContainerLayout(
            MOBILE_NAVIGATION_BAR_PADDING,
            RootStackingContextZIndices.MobileNavigationBar,
          ),
        )}
      >
        <nav
          {...stylex.props(
            styles.navigationBar,
            isHidden && styles.navigationBarHidden,
          )}
          aria-hidden={isHidden}
          inert={isHidden || undefined}
        >
          {items.map(({ Icon, name, label, onClick }) => (
            <IconButton
              key={name}
              {...stylex.props(
                styles.navigationButton,
                activeItemName === name && styles.navigationButtonPressed,
                styles.navigationButtonHover,
              )}
              variant="ghost"
              shape="round"
              aria-label={label}
              aria-pressed={activeItemName === name}
              onClick={onClick}
              tabIndex={isHidden ? -1 : 0}
            >
              <Icon aria-hidden />
            </IconButton>
          ))}
        </nav>
      </div>
    </>
  );
};
