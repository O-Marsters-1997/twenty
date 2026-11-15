import * as stylex from '@stylexjs/stylex';
import { useRef } from 'react';

import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isCurrentUserLoadedState } from '@/auth/states/isCurrentUserLoadedState';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { OnboardingConstructionSiteCanvasEffect } from '@/onboarding/components/OnboardingConstructionSite/OnboardingConstructionSiteCanvasEffect';
import { getOnboardingConstructionSiteStage } from '@/onboarding/components/OnboardingConstructionSite/getOnboardingConstructionSiteStage';
import { getIsLastOnboardingStep } from '@/onboarding/utils/getIsLastOnboardingStep';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useThemeColorScheme } from 'twenty-ui/theme';
import { media } from 'twenty-ui/theme/constants.stylex';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';
import { useMediaQuery } from 'twenty-ui/utilities';

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  canvas: {
    animationDuration: '0.8s',
    animationFillMode: 'both',
    animationName: { default: fadeIn, [media.reducedMotion]: 'none' },
    animationTimingFunction: 'ease-out',
    color: `color-mix(in srgb, ${borderColor['--t-border-color-medium']} 50%, ${borderColor['--t-border-color-strong']} 50%)`,
    display: 'block',
    height: '100%',
    width: '100%',
  },
});

export const OnboardingConstructionSite = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentUser = useAtomStateValue(currentUserState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const isClientConfigLoaded = useAtomStateValue(
    clientConfigApiStatusState,
  ).isLoadedOnce;
  const isCurrentUserLoaded = useAtomStateValue(isCurrentUserLoadedState);
  const colorScheme = useThemeColorScheme();
  const prefersReducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)',
  );

  if (!isClientConfigLoaded || !isCurrentUserLoaded) {
    return null;
  }

  const { stageIndex } = getOnboardingConstructionSiteStage({
    onboardingStatus: currentUser?.onboardingStatus,
    isLastOnboardingStep: getIsLastOnboardingStep({
      currentUser,
      currentWorkspace,
    }),
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        {...stylex.props(styles.canvas)}
      />
      <OnboardingConstructionSiteCanvasEffect
        canvasRef={canvasRef}
        stageIndex={stageIndex}
        colorScheme={colorScheme}
        prefersReducedMotion={prefersReducedMotion}
      />
    </>
  );
};
