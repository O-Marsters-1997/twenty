import { onboardingLayout } from '../../../../onboarding/constants/onboardingLayout.stylex';
import { useAuth } from '@/auth/hooks/useAuth';
import { StyledTwoFactorInstructions } from '@/auth/sign-in-up/components/internal/SignInUpTwoFactorAuthenticationStyles';
import { loginTokenState } from '@/auth/states/loginTokenState';
import { qrCodeState } from '@/auth/states/qrCode';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { getTwoFactorAuthenticationErrorToastOptions } from '@/auth/utils/getTwoFactorAuthenticationErrorToastOptions';
import { useReadCaptchaToken } from '@/captcha/hooks/useReadCaptchaToken';
import { useCaptcha } from '@/client-config/hooks/useCaptcha';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type FormEvent, useState } from 'react';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { MainButton } from 'twenty-ui/components/input';
import { useToast } from 'twenty-ui/components/feedback';
import { Button } from 'twenty-ui/primitives/input';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  form: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    width: onboardingLayout.contentBlockWidth,
  },
  inputContainer: {
    marginBottom: spacing['--t-spacing-4'],
    width: '100%',
  },
  actionBackLinkContainer: {
    marginTop: spacing['--t-spacing-3'],
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',
  },
});

export const SignInUpTwoFactorAuthenticationRecovery = () => {
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { getAuthTokensFromTwoFactorAuthenticationRecoveryCode } = useAuth();
  const { enqueueToast } = useToast();
  const navigate = useNavigateApp();
  const { readCaptchaToken } = useReadCaptchaToken();
  const { isCaptchaReady } = useCaptcha();
  const loginToken = useAtomStateValue(loginTokenState);
  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const setQrCode = useSetAtomState(qrCodeState);
  const { t } = useLingui();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isCaptchaReady) {
      enqueueToast({
        status: 'error',
        children: t`Captcha (anti-bot check) is still loading, try again`,
      });
      return;
    }

    if (!isNonEmptyString(loginToken)) {
      return navigate(AppPath.SignInUp);
    }

    setIsLoading(true);

    try {
      const { provisioningUri } =
        await getAuthTokensFromTwoFactorAuthenticationRecoveryCode(
          recoveryCode,
          loginToken,
          readCaptchaToken(),
        );

      if (isDefined(provisioningUri)) {
        setQrCode(provisioningUri);
        setSignInUpStep(SignInUpStep.TwoFactorAuthenticationProvision);
        return;
      }

      enqueueToast({
        status: 'info',
        children: t`Two-factor authentication was reset for this workspace. Set it up again from Settings, Profile.`,
      });
    } catch (error) {
      enqueueToast(
        getTwoFactorAuthenticationErrorToastOptions({
          error,
          fallbackMessage: t`Invalid or expired recovery code.`,
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setSignInUpStep(SignInUpStep.TwoFactorAuthenticationVerification);
  };

  return (
    <form {...stylex.props(styles.form)} onSubmit={handleSubmit}>
      <StyledTwoFactorInstructions>
        <Trans>
          Enter the recovery code a workspace admin gave you. Your current
          authenticator for this workspace will be removed.
        </Trans>
      </StyledTwoFactorInstructions>
      <div {...stylex.props(styles.inputContainer)}>
        <SettingsTextInput
          instanceId="sign-in-up-two-factor-authentication-recovery-code"
          autoComplete="one-time-code"
          autoFocus
          value={recoveryCode}
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
          onChange={setRecoveryCode}
          fullWidth
        />
      </div>
      <MainButton
        type="submit"
        fullWidth
        disabled={isLoading || !isNonEmptyString(recoveryCode.trim())}
      >{t`Continue`}</MainButton>
      <div {...stylex.props(styles.actionBackLinkContainer)}>
        <Button variant="link" onClick={handleBack}>
          <Trans>Back</Trans>
        </Button>
      </div>
    </form>
  );
};
