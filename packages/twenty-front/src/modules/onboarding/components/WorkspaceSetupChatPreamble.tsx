import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

import { WelcomePersonChip } from '@/onboarding/components/WelcomeOverlay/WelcomePersonChip';
import { WELCOME_TITLE_HANDOFF_TARGET_ELEMENT_ID } from '@/onboarding/constants/WelcomeTitleHandoffTargetElementId';
import { WELCOME_TITLE_MESSAGE } from '@/onboarding/constants/WelcomeTitleMessage';
import { isWelcomeAnimationLeavingState } from '@/onboarding/states/isWelcomeAnimationLeavingState';
import { isWelcomeAnimationVisibleState } from '@/onboarding/states/isWelcomeAnimationVisibleState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  preamble: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: '1.4em',
    overflowWrap: 'break-word',
    width: '100%',
  },
  preambleHidden: {
    opacity: 0,
  },
  singleLineHandoffRun: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing['--t-spacing-2'],
    whiteSpace: 'nowrap',
  },
  singleLineHandoffRunRevealing: {
    animationDelay: { default: '0.62s', [media.reducedMotion]: '0s' },
    animationDuration: '0.12s',
    animationFillMode: 'both',
    animationName: fadeIn,
    animationTimingFunction: 'ease-out',
  },
  continuationRevealing: {
    animationDelay: { default: '0.8s', [media.reducedMotion]: '0s' },
    animationDuration: '0.2s',
    animationFillMode: 'both',
    animationName: fadeIn,
    animationTimingFunction: 'ease-out',
  },
});

export const WorkspaceSetupChatPreamble = () => {
  const { t } = useLingui();
  const isWelcomeAnimationVisible = useAtomStateValue(
    isWelcomeAnimationVisibleState,
  );
  const isWelcomeAnimationLeaving = useAtomStateValue(
    isWelcomeAnimationLeavingState,
  );

  const isHiddenBehindOverlay =
    isWelcomeAnimationVisible && !isWelcomeAnimationLeaving;

  return (
    <div
      {...stylex.props(
        styles.preamble,
        isHiddenBehindOverlay && styles.preambleHidden,
      )}
    >
      <span
        id={WELCOME_TITLE_HANDOFF_TARGET_ELEMENT_ID}
        {...stylex.props(
          styles.singleLineHandoffRun,
          isWelcomeAnimationLeaving && styles.singleLineHandoffRunRevealing,
        )}
      >
        {t(WELCOME_TITLE_MESSAGE)}
        <WelcomePersonChip avatarSize="xs" sizeVariant="compact" />
      </span>{' '}
      <span
        {...stylex.props(
          isWelcomeAnimationLeaving && styles.continuationRevealing,
        )}
      >
        {t`Let's set it up around the way you work.`}
      </span>
    </div>
  );
};
