import { onboardingLayout } from '../../../../onboarding/constants/onboardingLayout.stylex';
import { TwoFactorAuthenticationSetupEffect } from '@/auth/components/TwoFactorAuthenticationProvisionEffect';
import { qrCodeState } from '@/auth/states/qrCode';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import {
  StyledTwoFactorInstructions,
  StyledTwoFactorMainContent,
} from '@/auth/sign-in-up/components/internal/SignInUpTwoFactorAuthenticationStyles';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { extractSecretFromOtpUri } from '@/settings/two-factor-authentication/utils/extractSecretFromOtpUri';
import { Trans, useLingui } from '@lingui/react/macro';
import QRCodeModule from 'react-qr-code';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { MainButton } from 'twenty-ui/components/input';
import { IconCopy } from 'twenty-ui/icon';
import { Loader } from 'twenty-ui/primitives/feedback';
import { useTheme } from 'twenty-ui/theme';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { resolveCjsModuleDefaultExport } from '~/utils/resolveCjsModuleDefaultExport';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const QRCode = resolveCjsModuleDefaultExport(QRCodeModule);

const styles = stylex.create({
  form: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    width: onboardingLayout.contentBlockWidth,
  },
  copySetupKeyLink: {
    alignItems: 'center',
    background: 'none',
    borderStyle: 'none',
    color: { default: fontColor['--t-font-color-secondary'], ':hover': fontColor['--t-font-color-primary'] },
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-1'],
    marginTop: spacing['--t-spacing-2'],
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    textDecoration: 'underline',
  },
});

export const SignInUpTwoFactorAuthenticationProvision = () => {
  const theme = useTheme();
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();
  const qrCode = useAtomStateValue(qrCodeState);
  const setSignInUpStep = useSetAtomState(signInUpStepState);

  const handleClick = () => {
    setSignInUpStep(SignInUpStep.TwoFactorAuthenticationVerification);
  };

  const handleCopySetupKey = async () => {
    if (!qrCode) return;

    const secret = extractSecretFromOtpUri(qrCode);
    if (secret !== null) {
      await copyToClipboard(secret, t`Setup key copied to clipboard`);
    }
  };

  return (
    <>
      <TwoFactorAuthenticationSetupEffect />
      <div {...stylex.props(styles.form)}>
        <StyledTwoFactorInstructions>
          <Trans>
            Use authenticator apps and browser extensions like 1Password, Authy,
            Microsoft Authenticator to generate one-time passwords
          </Trans>
        </StyledTwoFactorInstructions>
        <StyledTwoFactorMainContent>
          {!qrCode ? <Loader /> : <QRCode value={qrCode} />}
          {qrCode && (
            <button onClick={handleCopySetupKey} {...stylex.props(styles.copySetupKeyLink)}>
              <IconCopy size={theme.icon.size.sm} />
              <Trans>Copy Setup Key</Trans>
            </button>
          )}
        </StyledTwoFactorMainContent>
        <MainButton onClick={handleClick} fullWidth>{t`Next`}</MainButton>
      </div>
    </>
  );
};
