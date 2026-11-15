import { useOnboardingMotionTransition } from '@/onboarding/hooks/useOnboardingMotionTransition';
import * as stylex from '@stylexjs/stylex';
import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode } from 'react';

const styles = stylex.create({
  reveal: {
    maxWidth: '100%',
    overflow: 'hidden',
  },
});

type OnboardingAnimatedRevealProps = {
  isVisible: boolean;
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

export const OnboardingAnimatedReveal = ({
  isVisible,
  children,
  xstyle,
}: OnboardingAnimatedRevealProps) => {
  const transition = useOnboardingMotionTransition();

  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.div
          {...stylex.props(styles.reveal, xstyle)}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
