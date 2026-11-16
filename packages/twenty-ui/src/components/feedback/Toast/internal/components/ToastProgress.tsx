import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { ProgressBar } from '@ui/primitives/feedback/ProgressBar/ProgressBar';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { media } from '../../../../../theme/constants.stylex';
import { isCountdownDuration } from '../utils/isCountdownDuration';
import { countdownVars } from './ToastProgress.stylex';

type ToastProgressProps = {
  progress?: number;
  duration: number;
  remainingDuration: number;
  revision: number;
  isPaused: boolean;
  barColor: string;
};

export const ToastProgress = ({
  progress,
  duration,
  remainingDuration,
  revision,
  isPaused,
  barColor,
}: ToastProgressProps) => {
  if (isDefined(progress)) {
    return (
      <ProgressBar
        value={progress}
        barColor={barColor}
        className={stylex.props(styles.progressBar).className}
      />
    );
  }

  if (!isCountdownDuration(duration)) {
    return null;
  }

  return (
    <div
      key={revision}
      {...stylex.props(styles.countdown, isPaused && styles.paused)}
      data-paused={isPaused || undefined}
      style={
        {
          '--toast-countdown-color': barColor,
          '--toast-countdown-width': `${(remainingDuration / duration) * 100}%`,
          '--toast-countdown-duration': `${remainingDuration}ms`,
        } as CSSProperties
      }
    />
  );
};

const countdownShrink = stylex.keyframes({
  from: { width: countdownVars['--toast-countdown-width'] },
  to: { width: 0 },
});

const styles = stylex.create({
  countdown: {
    animationDuration: countdownVars['--toast-countdown-duration'],
    animationFillMode: 'forwards',
    animationName: countdownShrink,
    animationTimingFunction: 'linear',
    backgroundColor: countdownVars['--toast-countdown-color'],
    display: {
      default: null,
      [media.reducedMotion]: 'none',
    },
    height: '100%',
    width: countdownVars['--toast-countdown-width'],
  },
  progressBar: {
    height: '100%',
  },
  paused: {
    animationPlayState: 'paused',
  },
});
