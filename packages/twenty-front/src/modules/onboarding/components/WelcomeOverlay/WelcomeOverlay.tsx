import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { createPortal } from 'react-dom';
import { isDefined } from 'twenty-shared/utils';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  background,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { WelcomeAnimationAutoLeaveEffect } from '@/onboarding/components/WelcomeOverlay/WelcomeAnimationAutoLeaveEffect';
import { WelcomeAnimationForcedTeardownEffect } from '@/onboarding/components/WelcomeOverlay/WelcomeAnimationForcedTeardownEffect';
import { WelcomeHalftoneCanvas } from '@/onboarding/components/WelcomeOverlay/WelcomeHalftoneCanvas';
import { WelcomePersonChip } from '@/onboarding/components/WelcomeOverlay/WelcomePersonChip';
import { WELCOME_TITLE_MESSAGE } from '@/onboarding/constants/WelcomeTitleMessage';
import { WELCOME_TITLE_SOURCE_ELEMENT_ID } from '@/onboarding/constants/WelcomeTitleSourceElementId';
import { isWelcomeAnimationLeavingState } from '@/onboarding/states/isWelcomeAnimationLeavingState';
import { isWelcomeAnimationVisibleState } from '@/onboarding/states/isWelcomeAnimationVisibleState';
import { welcomeTitleFlightState } from '@/onboarding/states/welcomeTitleFlightState';
import { useIsMobile } from 'twenty-ui/utilities';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { rootStackingContextZIndices } from '../../../ui/layout/constants/rootStackingContextZIndices.stylex';
import { flightVars } from './WelcomeOverlay.stylex';

const NARROW_VIEWPORT = '@media (max-width: 600px)';

const backdropOut = stylex.keyframes({
  to: { opacity: 0 },
});

const titleIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const titleOut = stylex.keyframes({
  to: { opacity: 0, transform: 'translateY(-10px)' },
});

const titleFadeOut = stylex.keyframes({
  to: { opacity: 0 },
});

const titleFlight = stylex.keyframes({
  to: {
    transform: `translate(${flightVars.translateX}, ${flightVars.translateY}) scale(${flightVars.scale})`,
  },
});

const titleFlightOut = stylex.keyframes({
  to: { opacity: 0 },
});

const boldRunOut = stylex.keyframes({
  to: { opacity: 0 },
});

const regularRunIn = stylex.keyframes({
  to: { opacity: 1 },
});

const wordIn = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(14px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
});

const wordFadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  overlay: {
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: rootStackingContextZIndices.welcomeOverlay,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  backdrop: {
    inset: '0',
    backgroundColor: background['--t-background-primary'],
    position: 'absolute',
    willChange: 'opacity',
    zIndex: 0,
  },
  backdropLeaving: {
    animationDelay: { default: '0.08s', [media.reducedMotion]: '0s' },
    animationDuration: { default: '0.7s', [media.reducedMotion]: '0.4s' },
    animationFillMode: 'forwards',
    animationName: backdropOut,
    animationTimingFunction: 'cubic-bezier(0.5, 0, 0.1, 1)',
  },
  canvasLayer: {
    inset: '0',
    position: 'absolute',
    zIndex: '1',
  },
  targetScaleChip: {
    display: 'inline-flex',
    fontSize: '0.5em',
    lineHeight: '1.4em',
    transform: 'scale(2)',
    transformOrigin: 'left center',
  },
  title: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    animationDelay: '0.8s',
    animationDuration: '0.3s',
    animationFillMode: 'both',
    animationName: { default: titleIn, [media.reducedMotion]: 'none' },
    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexWrap: { default: 'nowrap', [NARROW_VIEWPORT]: 'wrap' },
    fontSize: { default: '26px', [NARROW_VIEWPORT]: '20px' },
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    justifyContent: 'center',
    position: 'relative',
    whiteSpace: 'nowrap',
    willChange: 'transform, opacity',
    zIndex: 2,
    maxWidth: {
      default: null,
      [NARROW_VIEWPORT]: 'calc(90vw / var(--t-zoom, 1))',
    },
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: {
      default: spacing['--t-spacing-8'],
      [NARROW_VIEWPORT]: spacing['--t-spacing-2'],
    },
    paddingRight: {
      default: spacing['--t-spacing-8'],
      [NARROW_VIEWPORT]: spacing['--t-spacing-2'],
    },
    paddingTop: spacing['--t-spacing-4'],
  },
  titleLeaving: {
    animationDelay: '0s',
    animationDuration: '0.34s',
    animationFillMode: 'forwards',
    animationName: { default: titleOut, [media.reducedMotion]: titleFadeOut },
    animationTimingFunction: {
      default: 'cubic-bezier(0.4, 0, 1, 1)',
      [media.reducedMotion]: 'ease-out',
    },
  },
  titleFlying: {
    animationDelay: { default: '0s, 0.66s', [media.reducedMotion]: '0s' },
    animationDuration: {
      default: '0.62s, 0.14s',
      [media.reducedMotion]: '0.34s',
    },
    animationFillMode: 'forwards',
    animationName: {
      default: `${titleFlight}, ${titleFlightOut}`,
      [media.reducedMotion]: titleFadeOut,
    },
    animationTimingFunction: {
      default: 'cubic-bezier(0.16, 1, 0.3, 1), ease-out',
      [media.reducedMotion]: 'ease-out',
    },
    transformOrigin: `${flightVars.originX} center`,
  },
  titleFlight: (
    translateX: string,
    translateY: string,
    scale: number,
    originX: string,
  ) => ({
    [flightVars.translateX]: translateX,
    [flightVars.translateY]: translateY,
    [flightVars.scale]: scale,
    [flightVars.originX]: originX,
  }),
  titleBoldRun: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'inline-flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    whiteSpace: 'normal',
  },
  titleBoldRunFlying: {
    animationDelay: '0.12s',
    animationDuration: '0.38s',
    animationFillMode: 'forwards',
    animationName: { default: boldRunOut, [media.reducedMotion]: 'none' },
    animationTimingFunction: 'ease',
  },
  titleRegularRun: {
    gap: `calc(${spacing['--t-spacing-2']} * 2)`,
    alignItems: 'center',
    display: 'inline-flex',
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: '1.4em',
    opacity: 0,
    position: 'absolute',
    transform: 'translateY(-50%)',
    whiteSpace: 'nowrap',
    left: spacing['--t-spacing-8'],
    top: '50%',
  },
  titleRegularRunFlying: {
    animationDelay: '0.12s',
    animationDuration: '0.38s',
    animationFillMode: 'forwards',
    animationName: { default: regularRunIn, [media.reducedMotion]: 'none' },
    animationTimingFunction: 'ease',
  },
  word: {
    animationDuration: '0.6s',
    animationFillMode: 'both',
    animationName: { default: wordIn, [media.reducedMotion]: wordFadeIn },
    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'inline-flex',
    position: 'relative',
  },
  wordDelay: (index: number) => ({
    animationDelay: {
      default: `${1.1 + index * 0.07}s`,
      [media.reducedMotion]: '0s',
    },
  }),
});

export const WelcomeOverlay = () => {
  const { t } = useLingui();
  const isWelcomeAnimationVisible = useAtomStateValue(
    isWelcomeAnimationVisibleState,
  );
  const isWelcomeAnimationLeaving = useAtomStateValue(
    isWelcomeAnimationLeavingState,
  );
  const welcomeTitleFlight = useAtomStateValue(welcomeTitleFlightState);
  const isMobile = useIsMobile();

  if (!isWelcomeAnimationVisible) {
    return null;
  }

  const activeWelcomeTitleFlight = isMobile ? null : welcomeTitleFlight;
  const isFlying =
    isWelcomeAnimationLeaving && isDefined(activeWelcomeTitleFlight);

  const welcomeTitle = t(WELCOME_TITLE_MESSAGE);
  const welcomeTitleWords = welcomeTitle.split(' ');

  return createPortal(
    <div {...stylex.props(styles.overlay)}>
      {isWelcomeAnimationLeaving ? (
        <WelcomeAnimationForcedTeardownEffect />
      ) : (
        <WelcomeAnimationAutoLeaveEffect />
      )}
      <div
        {...stylex.props(
          styles.backdrop,
          isWelcomeAnimationLeaving && styles.backdropLeaving,
        )}
      />
      <div {...stylex.props(styles.canvasLayer)}>
        <WelcomeHalftoneCanvas isLeaving={isWelcomeAnimationLeaving} />
      </div>
      <div
        id={WELCOME_TITLE_SOURCE_ELEMENT_ID}
        {...stylex.props(
          styles.title,
          isWelcomeAnimationLeaving && !isFlying && styles.titleLeaving,
          isFlying && styles.titleFlying,
          isDefined(activeWelcomeTitleFlight) &&
            styles.titleFlight(
              `${activeWelcomeTitleFlight.translateXInPx}px`,
              `${activeWelcomeTitleFlight.translateYInPx}px`,
              activeWelcomeTitleFlight.scale,
              `${activeWelcomeTitleFlight.transformOriginXInPx}px`,
            ),
        )}
      >
        <span
          {...stylex.props(
            styles.titleBoldRun,
            isFlying && styles.titleBoldRunFlying,
          )}
        >
          {welcomeTitleWords.map((word, index) => (
            <span
              key={`${word}-${index}`}
              {...stylex.props(styles.word, styles.wordDelay(index))}
            >
              {word}
            </span>
          ))}
          <span
            {...stylex.props(
              styles.word,
              styles.wordDelay(welcomeTitleWords.length),
            )}
          >
            <WelcomePersonChip />
          </span>
        </span>
        <span
          aria-hidden
          {...stylex.props(
            styles.titleRegularRun,
            isFlying && styles.titleRegularRunFlying,
          )}
        >
          {welcomeTitle}
          <span {...stylex.props(styles.targetScaleChip)}>
            <WelcomePersonChip avatarSize="xs" sizeVariant="compact" />
          </span>
        </span>
      </div>
    </div>,
    document.body,
  );
};
