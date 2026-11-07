import { StyledOnboardingContentContainer } from '@/auth/components/StyledOnboardingContentContainer';
import { SignInUpWithCredentials } from '@/auth/sign-in-up/components/internal/SignInUpWithCredentials';
import { SignInUpWithGoogle } from '@/auth/sign-in-up/components/internal/SignInUpWithGoogle';
import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { useSignInUp } from '@/auth/sign-in-up/hooks/useSignInUp';
import { useSignInUpForm } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { workspaceAuthProvidersState } from '@/workspace/states/workspaceAuthProvidersState';
import { Trans } from '@lingui/react/macro';
import { FormProvider } from 'react-hook-form';
import { Separator } from 'twenty-ui/primitives/layout';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const SignInUpWorkspaceScopeForm = () => {
  const workspaceAuthProviders = useAtomStateValue(workspaceAuthProvidersState);

  const { form } = useSignInUpForm();

  const { handleResetPassword } = useHandleResetPassword();

  const { signInUpStep } = useSignInUp(form);

  if (!workspaceAuthProviders) {
    return null;
  }

  const providers = workspaceAuthProviders;

  return (
    <>
      <StyledOnboardingContentContainer>
        {providers.google && <SignInUpWithGoogle action="join-workspace" />}

        {providers.google && providers.password ? (
          <Separator style={{ marginBlock: themeCssVariables.spacing[3] }} />
        ) : null}
        {providers.password && (
          // oxlint-disable-next-line react/jsx-props-no-spreading
          <FormProvider {...form}>
            <SignInUpWithCredentials />
          </FormProvider>
        )}
      </StyledOnboardingContentContainer>
      {signInUpStep === SignInUpStep.Password && (
        <Button
          variant="link"
          onClick={handleResetPassword(form.getValues('email'))}
        >
          <Trans>Forgot your password?</Trans>
        </Button>
      )}
    </>
  );
};
