import { ONBOARDING_MOTION_SLIDE_OFFSET } from '@/onboarding/constants/OnboardingMotionSlideOffset';
import { useOnboardingMotionTransition } from '@/onboarding/hooks/useOnboardingMotionTransition';
import { onboardingNavigationDirectionState } from '@/onboarding/states/onboardingNavigationDirectionState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  transitionContainer: {
    flex: '1',
    display: 'flex',
    position: 'relative',
    minHeight: '0',
    minWidth: '0',
  },
  transitionPage: {
    inset: '0',
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    minHeight: '0',
    minWidth: '0',
  },
});

const transitionPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: (exitSlideOffset: number) => ({
    opacity: 0,
    y: exitSlideOffset,
    pointerEvents: 'none',
  }),
};

export const OnboardingTransitionOutlet = () => {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const shouldReduceMotion = useReducedMotion();
  const transition = useOnboardingMotionTransition();
  const onboardingNavigationDirection = useAtomStateValue(
    onboardingNavigationDirectionState,
  );

  const directionalExitSlideOffset =
    onboardingNavigationDirection === 'backward'
      ? ONBOARDING_MOTION_SLIDE_OFFSET
      : -ONBOARDING_MOTION_SLIDE_OFFSET;

  const exitSlideOffset = shouldReduceMotion ? 0 : directionalExitSlideOffset;

  return (
    <div {...stylex.props(styles.transitionContainer)}>
      <AnimatePresence custom={exitSlideOffset}>
        <motion.div
          {...stylex.props(styles.transitionPage)}
          key={pathname}
          custom={exitSlideOffset}
          variants={transitionPageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
