import { currentUserState } from '@/auth/states/currentUserState';
import { OnboardingLayout } from '@/onboarding/components/OnboardingLayout';
import { OnboardingTransitionOutlet } from '@/onboarding/components/OnboardingTransitionOutlet';
import { useGoBackToPreviousOnboardingStep } from '@/onboarding/hooks/useGoBackToPreviousOnboardingStep';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { isDefined } from 'twenty-shared/utils';

const OnboardingConstructionSite = lazy(() =>
  import('@/onboarding/components/OnboardingConstructionSite/OnboardingConstructionSite').then(
    (module) => ({ default: module.OnboardingConstructionSite }),
  ),
);

export const OnboardingStepLayout = () => {
  const currentUser = useAtomStateValue(currentUserState);
  const {
    goBackToPreviousOnboardingStep,
    isGoingBackToPreviousOnboardingStep,
  } = useGoBackToPreviousOnboardingStep();

  const hasPreviousOnboardingStep = isDefined(
    currentUser?.previousOnboardingStatus,
  );

  return (
    <OnboardingLayout
      onBack={
        hasPreviousOnboardingStep
          ? () => {
              void goBackToPreviousOnboardingStep();
            }
          : undefined
      }
      isBackDisabled={isGoingBackToPreviousOnboardingStep}
      backgroundComponent={
        <ErrorBoundary fallbackRender={() => null}>
          <Suspense fallback={null}>
            <OnboardingConstructionSite />
          </Suspense>
        </ErrorBoundary>
      }
    >
      <OnboardingTransitionOutlet />
    </OnboardingLayout>
  );
};
