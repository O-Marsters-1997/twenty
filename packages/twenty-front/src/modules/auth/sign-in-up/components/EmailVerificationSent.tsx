import { SubTitle } from '@/auth/components/SubTitle';
import { Title } from '@/auth/components/Title';
import { AnimatedEaseIn } from '@/auth/components/internal/AnimatedEaseIn/AnimatedEaseIn';
import { useHandleResendEmailVerificationToken } from '@/auth/sign-in-up/hooks/useHandleResendEmailVerificationToken';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { OnboardingModalCircularIcon } from '@/onboarding/components/OnboardingModalCircularIcon';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { t } from '@lingui/core/macro';
import { MainButton } from 'twenty-ui/components/input';
import { IconGmail, IconMail, IconMailX, IconMicrosoft } from 'twenty-ui/icon';
import { openUrlInNewTab } from '~/utils/openUrlInNewTab';
import * as stylex from '@stylexjs/stylex';
import {
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-8'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  textContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
  },
  email: {
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  buttonsContainer: {
    gap: spacing['--t-spacing-3'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '240px',
    width: '100%',
  },
  bottomLinks: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  linkButton: {
    background: 'none',
    borderStyle: 'none',
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-secondary'],
    },
    cursor: { default: 'pointer', ':disabled': 'not-allowed' },
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: '140%',
    opacity: { default: null, ':disabled': '0.5' },
  },
  dot: {
    background: fontColor['--t-font-color-light'],
    cornerShape: 'round',
    borderBottomLeftRadius: '50%',
    borderBottomRightRadius: '50%',
    borderTopLeftRadius: '50%',
    borderTopRightRadius: '50%',
    height: '2px',
    width: '2px',
  },
});

export const EmailVerificationSent = ({
  email,
  isError = false,
}: {
  email: string | null;
  isError?: boolean;
}) => {
  const setSignInUpStep = useSetAtomState(signInUpStepState);

  const { handleResendEmailVerificationToken, loading: isLoading } =
    useHandleResendEmailVerificationToken();

  const handleOpenGmail = () => {
    const gmailUrl = email
      ? `https://mail.google.com/mail/u/${email}/`
      : 'https://mail.google.com/';
    openUrlInNewTab(gmailUrl);
  };

  const handleOpenOutlook = () => {
    const outlookUrl = email
      ? `https://outlook.live.com/mail/${email}/`
      : 'https://outlook.live.com/';
    openUrlInNewTab(outlookUrl);
  };

  const handleChangeEmail = () => {
    setSignInUpStep(SignInUpStep.Email);
  };

  const title = isError ? t`Email Verification Failed` : t`Check your Emails`;
  const subtitle = isError
    ? t`We encountered an issue verifying`
    : t`A verification email has been sent to`;

  const Icon = isError ? IconMailX : IconMail;

  const mainButtons = isError ? (
    <>
      <MainButton
        onClick={handleChangeEmail}
        fullWidth
        variant="outline"
      >{t`Try with another email`}</MainButton>
      <MainButton
        onClick={handleResendEmailVerificationToken(email)}
        disabled={isLoading}
        fullWidth
      >
        {isLoading ? t`Sending...` : t`Resend email`}
      </MainButton>
    </>
  ) : (
    <>
      <MainButton
        onClick={handleOpenGmail}
        startIcon={<IconGmail />}
        fullWidth
        variant="outline"
      >{t`Open Gmail`}</MainButton>
      <MainButton
        onClick={handleOpenOutlook}
        startIcon={<IconMicrosoft />}
        fullWidth
        variant="outline"
      >{t`Open Outlook`}</MainButton>
    </>
  );

  return (
    <div {...stylex.props(styles.container)}>
      <AnimatedEaseIn>
        <OnboardingModalCircularIcon Icon={Icon} />
      </AnimatedEaseIn>

      <div {...stylex.props(styles.textContainer)}>
        <Title animate noMarginTop>
          {title}
        </Title>
        <SubTitle>
          {subtitle} <span {...stylex.props(styles.email)}>{email}</span>
        </SubTitle>
      </div>

      <div {...stylex.props(styles.buttonsContainer)}>{mainButtons}</div>

      {!isError && (
        <div {...stylex.props(styles.bottomLinks)}>
          <button
            onClick={handleResendEmailVerificationToken(email)}
            disabled={isLoading}
            {...stylex.props(styles.linkButton)}
          >
            {isLoading ? t`Sending...` : t`Resend email`}
          </button>
          <div {...stylex.props(styles.dot)} />
          <button
            onClick={handleChangeEmail}
            {...stylex.props(styles.linkButton)}
          >
            {t`Change email`}
          </button>
        </div>
      )}
    </div>
  );
};
