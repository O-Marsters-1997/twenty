import { Trans, useLingui } from '@lingui/react/macro';
import { FormProvider } from 'react-hook-form';
import QRCodeModule from 'react-qr-code';

import { qrCodeState } from '@/auth/states/qrCode';
import { SaveAndCancelButtons } from '@/settings/components/SaveAndCancelButtons/SaveAndCancelButtons';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { DeleteTwoFactorAuthentication } from '@/settings/two-factor-authentication/components/DeleteTwoFactorAuthenticationMethod';
import { TwoFactorAuthenticationSetupForSettingsEffect } from '@/settings/two-factor-authentication/components/TwoFactorAuthenticationSetupForSettingsEffect';
import { TwoFactorAuthenticationVerificationForSettings } from '@/settings/two-factor-authentication/components/TwoFactorAuthenticationVerificationForSettings';
import { useCurrentUserWorkspaceTwoFactorAuthentication } from '@/settings/two-factor-authentication/hooks/useCurrentUserWorkspaceTwoFactorAuthentication';
import { useTwoFactorVerificationForSettings } from '@/settings/two-factor-authentication/hooks/useTwoFactorVerificationForSettings';
import { extractSecretFromOtpUri } from '@/settings/two-factor-authentication/utils/extractSecretFromOtpUri';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { Loader } from 'twenty-ui/primitives/feedback';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { resolveCjsModuleDefaultExport } from '~/utils/resolveCjsModuleDefaultExport';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const QRCode = resolveCjsModuleDefaultExport(QRCodeModule);

const styles = stylex.create({
  qRCodeContainer: {
    gap: spacing['--t-spacing-3'],
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: spacing['--t-spacing-4'],
    marginLeft: '0',
    marginRight: '0',
    marginTop: spacing['--t-spacing-4'],
  },
  qRCodeWrapper: {
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
  qRCodeSizer: {
    height: '137px',
    width: '137px',
  },
  oTPContainer: {
    width: 'fit-content',
  },
  copySetupKeyText: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: 1.5,
    textAlign: 'left',
  },
  copySetupKeyLink: {
    background: 'none',
    borderStyle: 'none',
    textDecoration: 'underline',
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-secondary'],
    },
    cursor: 'pointer',
    display: 'inline',
    fontSize: fontSize['--t-font-size-sm'],
    marginLeft: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
  },
  divider: {
    marginBottom: spacing['--t-spacing-6'],
    marginLeft: '0',
    marginRight: '0',
    marginTop: spacing['--t-spacing-6'],
    width: '100%',
  },
});

export const SettingsTwoFactorAuthenticationMethod = () => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();
  const qrCode = useAtomStateValue(qrCodeState);

  const { currentUserWorkspaceTwoFactorAuthenticationMethods } =
    useCurrentUserWorkspaceTwoFactorAuthentication();

  const has2FAMethod =
    currentUserWorkspaceTwoFactorAuthenticationMethods['TOTP']?.status ===
    'VERIFIED';

  const verificationForm = useTwoFactorVerificationForSettings();

  const shouldShowActionButtons = !has2FAMethod;

  const handleCopySetupKey = async () => {
    if (!qrCode) return;

    const secret = extractSecretFromOtpUri(qrCode);
    if (secret !== null) {
      await copyToClipboard(secret, t`Setup key copied to clipboard`);
    }
  };

  return (
    // oxlint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...verificationForm.formConfig}>
      <SettingsPageLayout
        title={t`Two Factor Authentication`}
        links={[
          {
            children: <Trans>User</Trans>,
            href: getSettingsPath(SettingsPath.ProfilePage),
          },
          {
            children: <Trans>Profile</Trans>,
            href: getSettingsPath(SettingsPath.ProfilePage),
          },
          {
            children: <Trans>Two-Factor Authentication</Trans>,
          },
        ]}
        actionButton={
          shouldShowActionButtons ? (
            <SaveAndCancelButtons
              isSaveDisabled={!verificationForm.canSave}
              isCancelDisabled={verificationForm.isSubmitting}
              isLoading={verificationForm.isLoading}
              onCancel={verificationForm.handleCancel}
              onSave={verificationForm.formConfig.handleSubmit(
                verificationForm.handleSave,
              )}
            />
          ) : undefined
        }
      >
        <SettingsPageContainer>
          {has2FAMethod ? (
            <Section.Root>
              <DeleteTwoFactorAuthentication />
            </Section.Root>
          ) : (
            <Section.Root>
              <TwoFactorAuthenticationSetupForSettingsEffect />
              <Section.Header
                title={t`Authenticator app`}
                description={t`Authenticator apps and browser extensions like 1Password, Authy, Microsoft Authenticator, etc. generate one-time passwords that are used as a second factor to verify your identity when prompted during sign-in.`}
              />
              <div {...stylex.props(styles.qRCodeContainer)}>
                {!qrCode ? (
                  <Loader />
                ) : (
                  <>
                    <div {...stylex.props(styles.qRCodeWrapper)}>
                      <div {...stylex.props(styles.qRCodeSizer)}>
                        <QRCode value={qrCode} />
                      </div>
                    </div>
                    <div {...stylex.props(styles.copySetupKeyText)}>
                      <Trans>Can't scan? Copy the</Trans>{' '}
                      <button
                        onClick={handleCopySetupKey}
                        {...stylex.props(styles.copySetupKeyLink)}
                      >
                        <Trans>setup key</Trans>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div {...stylex.props(styles.divider)} />

              <Section.Header
                title={t`Verify the code from the app`}
                description={t`Copy paste the code below`}
              />
              <div {...stylex.props(styles.oTPContainer)}>
                <TwoFactorAuthenticationVerificationForSettings />
              </div>
            </Section.Root>
          )}
        </SettingsPageContainer>
      </SettingsPageLayout>
    </FormProvider>
  );
};
