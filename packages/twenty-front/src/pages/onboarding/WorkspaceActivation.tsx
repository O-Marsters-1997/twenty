import { isAppEffectRedirectEnabledState } from '@/auth/states/isAppEffectRedirectEnabledState';
import { Logo } from '@/auth/components/Logo';
import { SubTitle } from '@/auth/components/SubTitle';
import { Title } from '@/auth/components/Title';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isCreatingWorkspaceState } from '@/auth/states/isCreatingWorkspaceState';
import { OnboardingStepAnimatedItem } from '@/onboarding/components/OnboardingStepAnimatedItem';
import { useSetNextOnboardingStatus } from '@/onboarding/hooks/useSetNextOnboardingStatus';
import { onboardingActivationFailedState } from '@/onboarding/states/onboardingActivationFailedState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useLoadCurrentUser } from '@/users/hooks/useLoadCurrentUser';
import { useMutation } from '@apollo/client/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useCallback, useEffect, useRef } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { MainButton } from 'twenty-ui/components/input';
import { ActivateWorkspaceDocument } from '~/generated-metadata/graphql';
import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    background: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  buttonContainer: {
    marginTop: spacing['--t-spacing-8'],
    width: '200px',
  },
});

export const WorkspaceActivation = () => {
  const { t } = useLingui();
  const { enqueueToast } = useToast();
  const setNextOnboardingStatus = useSetNextOnboardingStatus();
  const { loadCurrentUser } = useLoadCurrentUser();
  const [activateWorkspace, { loading: isActivating }] = useMutation(
    ActivateWorkspaceDocument,
  );
  const onboardingActivationFailed = useAtomStateValue(
    onboardingActivationFailedState,
  );
  const setOnboardingActivationFailed = useSetAtomState(
    onboardingActivationFailedState,
  );
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const setIsCreatingWorkspace = useSetAtomState(isCreatingWorkspaceState);
  const setIsAppEffectRedirectEnabled = useSetAtomState(
    isAppEffectRedirectEnabledState,
  );

  const activate = useCallback(async () => {
    setOnboardingActivationFailed(false);

    try {
      const result = await activateWorkspace({
        variables: {
          input: {},
        },
      });

      if (isDefined(result.error)) {
        throw result.error;
      }

      setIsAppEffectRedirectEnabled(false);
      await loadCurrentUser();
      setNextOnboardingStatus({ stepHistoryEffect: 'leaveUnchanged' });
      setIsCreatingWorkspace(false);
      setIsAppEffectRedirectEnabled(true);
    } catch (error) {
      setIsAppEffectRedirectEnabled(true);
      setIsCreatingWorkspace(false);
      setOnboardingActivationFailed(true);

      enqueueToast(getToastOptionsFromError({ error }));
    }
  }, [
    activateWorkspace,
    enqueueToast,
    loadCurrentUser,
    setOnboardingActivationFailed,
    setIsAppEffectRedirectEnabled,
    setIsCreatingWorkspace,
    setNextOnboardingStatus,
  ]);

  // Guard the one-shot trigger with a ref, not state: a ref mutation is
  // synchronous and survives StrictMode's double-invocation of effects, whereas
  // a state flag stays false in the second (same-closure) invocation and fires
  // a second concurrent activation that trips the server's lock.
  // oxlint-disable-next-line twenty/no-state-useref
  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    if (hasTriggeredRef.current || !isDefined(currentWorkspace)) {
      return;
    }

    hasTriggeredRef.current = true;
    void activate();
  }, [activate, currentWorkspace]);

  if (!onboardingActivationFailed) {
    return null;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <OnboardingStepAnimatedItem index={0}>
        <Logo
          primaryLogo={
            isNonEmptyString(currentWorkspace?.logo)
              ? currentWorkspace?.logo
              : undefined
          }
        />
      </OnboardingStepAnimatedItem>
      <OnboardingStepAnimatedItem index={1}>
        <Title>
          <Trans>Workspace creation failed</Trans>
        </Title>
      </OnboardingStepAnimatedItem>
      <OnboardingStepAnimatedItem index={2}>
        <SubTitle>
          <Trans>
            Something went wrong while creating your workspace. Please try
            again.
          </Trans>
        </SubTitle>
      </OnboardingStepAnimatedItem>
      <OnboardingStepAnimatedItem index={3}>
        <div {...stylex.props(styles.buttonContainer)}>
          <MainButton
            onClick={() => {
              void activate();
            }}
            disabled={isActivating}
            fullWidth
          >{t`Retry`}</MainButton>
        </div>
      </OnboardingStepAnimatedItem>
    </div>
  );
};
