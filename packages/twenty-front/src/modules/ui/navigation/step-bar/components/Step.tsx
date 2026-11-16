import * as stylex from '@stylexjs/stylex';
import { motion } from 'framer-motion';

import { AnimatedCheckmark } from '@/ui/navigation/step-bar/components/internal/AnimatedCheckmark/AnimatedCheckmark';
import { useIsMobile } from 'twenty-ui/utilities';
import { useTheme } from 'twenty-ui/theme';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: {
      default: 1,
      [media.mobile]: 0,
    },
  },
  containerLast: {
    flexGrow: 0,
  },
  stepCircle: {
    alignItems: 'center',
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'flex',
    flexBasis: 'auto',
    flexShrink: 0,
    height: '20px',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '20px',
  },
  stepCircleNext: {
    borderColor: borderColor['--t-border-color-medium'],
  },
  stepCirclePast: {
    borderColor: borderColor['--t-border-color-inverted'],
  },
  stepIndex: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  stepIndexCurrent: {
    color: fontColor['--t-font-color-inverted'],
  },
  stepLabel: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginLeft: spacing['--t-spacing-2'],
    whiteSpace: 'nowrap',
  },
  stepLabelNext: {
    color: fontColor['--t-font-color-tertiary'],
  },
  stepLine: {
    height: '2px',
    marginLeft: spacing['--t-spacing-2'],
    marginRight: spacing['--t-spacing-2'],
    overflow: 'hidden',
    width: '100%',
  },
});

export type StepProps = React.PropsWithChildren &
  React.ComponentProps<'div'> & {
    isLast?: boolean;
    index?: number;
    label: string;
    activeStep?: number;
  };

export const Step = ({
  isLast = false,
  index = 0,
  label,
  children,
  activeStep = 0,
}: StepProps) => {
  const isMobile = useIsMobile();
  const theme = useTheme();

  const variantsLine = {
    previous: {
      backgroundColor: theme.font.color.primary,
      transition: { duration: 0.5 },
    },
    next: {
      backgroundColor: theme.border.color.medium,
      transition: { duration: 0.5 },
    },
  };

  const variantsCircle = {
    current: {
      backgroundColor: theme.background.invertedPrimary,
      transition: { duration: 0.5 },
    },
    previous: {
      backgroundColor: theme.background.secondary,
      transition: { duration: 0.5 },
    },
    next: {
      backgroundColor: theme.background.tertiary,
      transition: { duration: 0.5 },
    },
  };

  const isInPreviousSteps = activeStep > index;
  const isCurrentStep = activeStep === index;
  const isInNextSteps = activeStep < index;

  return (
    <div {...stylex.props(styles.container, isLast && styles.containerLast)}>
      <motion.div
        variants={variantsCircle}
        animate={
          isCurrentStep ? 'current' : isInPreviousSteps ? 'previous' : 'next'
        }
        {...stylex.props(
          styles.stepCircle,
          isInNextSteps ? styles.stepCircleNext : styles.stepCirclePast,
        )}
      >
        {isInPreviousSteps && (
          <AnimatedCheckmark
            isAnimating={isInPreviousSteps}
            color={theme.grayScale.gray12}
          />
        )}
        {!isInPreviousSteps && (
          <span
            {...stylex.props(
              styles.stepIndex,
              isCurrentStep && styles.stepIndexCurrent,
            )}
          >
            {index + 1}
          </span>
        )}
      </motion.div>
      <span
        {...stylex.props(
          styles.stepLabel,
          isInNextSteps && styles.stepLabelNext,
        )}
      >
        {label}
      </span>
      {!isLast && !isMobile && (
        <motion.div
          variants={variantsLine}
          animate={isInPreviousSteps ? 'previous' : 'next'}
          {...stylex.props(styles.stepLine)}
        />
      )}
      {(isInPreviousSteps || isCurrentStep) && children}
    </div>
  );
};

Step.displayName = 'StepBar';
