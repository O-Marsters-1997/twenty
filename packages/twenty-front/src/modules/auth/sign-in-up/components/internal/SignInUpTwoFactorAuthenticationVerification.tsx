import { onboardingLayout } from '../../../../onboarding/constants/onboardingLayout.stylex';
import { useAuth } from '@/auth/hooks/useAuth';
import {
  StyledTwoFactorInstructions,
  StyledTwoFactorMainContent,
} from '@/auth/sign-in-up/components/internal/SignInUpTwoFactorAuthenticationStyles';
import {
  type OTPFormValues,
  useTwoFactorAuthenticationForm,
} from '@/auth/sign-in-up/hooks/useTwoFactorAuthenticationForm';
import { loginTokenState } from '@/auth/states/loginTokenState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { getTwoFactorAuthenticationErrorToastOptions } from '@/auth/utils/getTwoFactorAuthenticationErrorToastOptions';
import { useReadCaptchaToken } from '@/captcha/hooks/useReadCaptchaToken';
import { useCaptcha } from '@/client-config/hooks/useCaptcha';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { Trans, useLingui } from '@lingui/react/macro';
import { OTPInput, type SlotProps } from 'input-otp';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { AppPath } from 'twenty-shared/types';
import { useToast } from 'twenty-ui/components/feedback';
import { MainButton } from 'twenty-ui/components/input';
import { Button } from 'twenty-ui/primitives/input';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export const Slot = (props: SlotProps) => {
  return (
    <div {...stylex.props(styles.slot, props.isActive && styles.slotActive)}>
      <div {...stylex.props(props.char == null && styles.placeholderChar)}>
        {props.char ?? props.placeholderChar}
      </div>
      {props.hasFakeCaret && <FakeCaret />}
    </div>
  );
};

const caretBlink = stylex.keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0 },
});

const styles = stylex.create({
  slot: {
    transition: 'all 0.3s',
    alignItems: 'center',
    display: 'flex',
    fontSize: '2rem',
    justifyContent: 'center',
    outlineColor: borderColor['--t-border-color-medium'],
    outlineStyle: 'none',
    outlineWidth: 0,
    position: 'relative',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomLeftRadius: { default: 0, ':first-of-type': '0.375rem' },
    borderBottomRightRadius: { default: 0, ':last-of-type': '0.375rem' },
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderLeftColor: borderColor['--t-border-color-medium'],
    borderLeftStyle: 'solid',
    borderLeftWidth: { default: 0, ':first-of-type': '1px' },
    borderRightColor: borderColor['--t-border-color-medium'],
    borderRightStyle: 'solid',
    borderRightWidth: '1px',
    borderTopColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: { default: 0, ':first-of-type': '0.375rem' },
    borderTopRightRadius: { default: 0, ':last-of-type': '0.375rem' },
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    height: '3.5rem',
    width: '2.5rem',
  },
  slotActive: {
    outlineColor: borderColor['--t-border-color-strong'],
    outlineStyle: 'solid',
    outlineWidth: '1px',
  },
  placeholderChar: {
    opacity: 0.2,
  },
  caretContainer: {
    inset: 0,
    alignItems: 'center',
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: caretBlink,
    animationTimingFunction: 'steps(2, start)',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'absolute',
  },
  form: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    width: onboardingLayout.contentBlockWidth,
  },
  caret: {
    backgroundColor: fontColor['--t-font-color-light'],
    height: '2rem',
    width: '1px',
  },
  dashContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    width: '2.5rem',
  },
  dash: {
    cornerShape: 'round',
    backgroundColor: fontColor['--t-font-color-primary'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-pill'],
    borderBottomRightRadius: borderRadius['--t-border-radius-pill'],
    borderTopLeftRadius: borderRadius['--t-border-radius-pill'],
    borderTopRightRadius: borderRadius['--t-border-radius-pill'],
    height: '0.25rem',
    width: '0.75rem',
  },
  oTPContainer: {
    alignItems: 'center',
    display: 'flex',
    opacity: { default: null, ':has(:disabled)': '0.3' },
  },
  slotGroup: {
    display: 'flex',
  },
  actionBackLinkContainer: {
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: spacing['--t-spacing-3'],
  },
});

const FakeCaret = () => {
  return (
    <div {...stylex.props(styles.caretContainer)}>
      <div {...stylex.props(styles.caret)} />
    </div>
  );
};

const FakeDash = () => {
  return (
    <div {...stylex.props(styles.dashContainer)}>
      <div {...stylex.props(styles.dash)} />
    </div>
  );
};

export const SignInUpTOTPVerification = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { getAuthTokensFromOTP } = useAuth();
  const { enqueueToast } = useToast();

  const navigate = useNavigateApp();
  const { readCaptchaToken } = useReadCaptchaToken();
  const { isCaptchaReady } = useCaptcha();
  const loginToken = useAtomStateValue(loginTokenState);
  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const { t } = useLingui();

  const { form } = useTwoFactorAuthenticationForm();

  const submitOTP = async (values: OTPFormValues) => {
    setIsLoading(true);
    try {
      if (!isCaptchaReady) {
        enqueueToast({
          status: 'error',
          children: t`Captcha (anti-bot check) is still loading, try again`,
        });
        setIsLoading(false);
        return;
      }

      const captchaToken = readCaptchaToken();

      if (!loginToken) {
        return navigate(AppPath.SignInUp);
      }

      await getAuthTokensFromOTP(values.otp, loginToken, captchaToken);
    } catch (error) {
      form.setValue('otp', '');

      enqueueToast(
        getTwoFactorAuthenticationErrorToastOptions({
          error,
          dedupeKey: 'invalid-otp-dedupe-key',
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setSignInUpStep(SignInUpStep.TwoFactorAuthenticationProvision);
  };

  const handleUseRecoveryCode = () => {
    setSignInUpStep(SignInUpStep.TwoFactorAuthenticationRecovery);
  };

  return (
    <form
      {...stylex.props(styles.form)}
      onSubmit={form.handleSubmit(submitOTP)}
    >
      <StyledTwoFactorInstructions>
        <Trans>Paste the code below</Trans>
      </StyledTwoFactorInstructions>
      <StyledTwoFactorMainContent>
        {/* // oxlint-disable-next-line react/jsx-props-no-spreading */}
        <Controller
          name="otp"
          control={form.control}
          render={({ field: { onChange, onBlur, value } }) => (
            <OTPInput
              maxLength={6}
              onBlur={onBlur}
              onChange={onChange}
              value={value}
              autoFocus
              render={({ slots }) => (
                <div {...stylex.props(styles.oTPContainer)}>
                  <div {...stylex.props(styles.slotGroup)}>
                    {slots.slice(0, 3).map((slot, idx) => (
                      <Slot
                        key={idx}
                        // oxlint-disable-next-line react/jsx-props-no-spreading
                        {...slot}
                      />
                    ))}
                  </div>

                  <FakeDash />

                  <div {...stylex.props(styles.slotGroup)}>
                    {slots.slice(3).map((slot, idx) => (
                      <Slot
                        key={idx}
                        // oxlint-disable-next-line react/jsx-props-no-spreading
                        {...slot}
                      />
                    ))}
                  </div>
                </div>
              )}
            />
          )}
        />
      </StyledTwoFactorMainContent>
      <MainButton
        type="submit"
        fullWidth
        disabled={isLoading}
      >{t`Submit`}</MainButton>
      <div {...stylex.props(styles.actionBackLinkContainer)}>
        <Button variant="link" onClick={handleUseRecoveryCode}>
          <Trans>Lost your authenticator? Use a recovery code</Trans>
        </Button>
      </div>
      <div {...stylex.props(styles.actionBackLinkContainer)}>
        <Button variant="link" onClick={handleBack}>
          <Trans>Back</Trans>
        </Button>
      </div>
    </form>
  );
};
