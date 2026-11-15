import * as stylex from '@stylexjs/stylex';
import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';
import { ONBOARDING_MOTION_SLIDE_OFFSET } from '@/onboarding/constants/OnboardingMotionSlideOffset';
import { ONBOARDING_MOTION_STAGGER_DELAY } from '@/onboarding/constants/OnboardingMotionStaggerDelay';
import { useOnboardingMotionTransition } from '@/onboarding/hooks/useOnboardingMotionTransition';
import { onboardingNavigationDirectionState } from '@/onboarding/states/onboardingNavigationDirectionState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const styles = stylex.create({
  item: {
    maxWidth: '100%',
  },
});

type OnboardingStepAnimatedItemProps = {
  index: number;
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

export const OnboardingStepAnimatedItem = ({
  index,
  children,
  xstyle,
}: OnboardingStepAnimatedItemProps) => {
  const transition = useOnboardingMotionTransition();
  const shouldReduceMotion = useReducedMotion();
  const onboardingNavigationDirection = useAtomStateValue(
    onboardingNavigationDirectionState,
  );

  const directionalEnterSlideOffset =
    onboardingNavigationDirection === 'backward'
      ? -ONBOARDING_MOTION_SLIDE_OFFSET
      : ONBOARDING_MOTION_SLIDE_OFFSET;

  return (
    <motion.div
      {...stylex.props(styles.item, xstyle)}
      initial={{
        opacity: 0,
        y: shouldReduceMotion ? 0 : directionalEnterSlideOffset,
      }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...transition,
        delay: shouldReduceMotion ? 0 : index * ONBOARDING_MOTION_STAGGER_DELAY,
      }}
    >
      {children}
    </motion.div>
  );
};
