import { TwoFactorAuthenticationVerificationCodeDash } from '@/settings/two-factor-authentication/components/TwoFactorAuthenticationVerificationCodeDash';
import { TwoFactorAuthenticationVerificationCodeSlot } from '@/settings/two-factor-authentication/components/TwoFactorAuthenticationVerificationCodeSlot';
import { ConfirmationDialog } from '@/ui/layout/dialog/components/ConfirmationDialog';
import { t } from '@lingui/core/macro';
import { OTPInput } from 'input-otp';
import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const OTP_LENGTH = 6;

const styles = stylex.create({
  confirmationContent: {
    gap: spacing['--t-spacing-4'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  oTPContainer: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
  },
});

type TwoFactorAuthenticationRecoveryCodeConfirmationDialogProps = {
  dialogId: string;
  memberName: string;
  onConfirm: (otp: string) => void;
};

export const TwoFactorAuthenticationRecoveryCodeConfirmationDialog = ({
  dialogId,
  memberName,
  onConfirm,
}: TwoFactorAuthenticationRecoveryCodeConfirmationDialogProps) => {
  const [otp, setOtp] = useState('');

  return (
    <ConfirmationDialog
      dialogId={dialogId}
      title={t`Generate a recovery code`}
      confirmButtonColor="accent"
      confirmButtonText={t`Generate code`}
      isConfirmButtonDisabled={otp.length !== OTP_LENGTH}
      onConfirmClick={() => {
        onConfirm(otp);
        setOtp('');
      }}
      onClose={() => setOtp('')}
      subtitle={
        <div {...stylex.props(styles.confirmationContent)}>
          <div>
            {t`The code lets ${memberName} sign in to this workspace once without their authenticator app. Using it removes their current authenticator and signs them out of their other sessions here. They will be notified by email.`}
          </div>
          <div>{t`Enter your two-factor authentication code to confirm.`}</div>
          <OTPInput
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={setOtp}
            autoFocus
            render={({ slots }) => (
              <div {...stylex.props(styles.oTPContainer)}>
                {slots.slice(0, 3).map((slot, index) => (
                  <TwoFactorAuthenticationVerificationCodeSlot
                    key={index}
                    char={slot.char}
                    placeholderChar={slot.placeholderChar}
                    isActive={slot.isActive}
                    hasFakeCaret={slot.hasFakeCaret}
                  />
                ))}
                <TwoFactorAuthenticationVerificationCodeDash />
                {slots.slice(3).map((slot, index) => (
                  <TwoFactorAuthenticationVerificationCodeSlot
                    key={index + 3}
                    char={slot.char}
                    placeholderChar={slot.placeholderChar}
                    isActive={slot.isActive}
                    hasFakeCaret={slot.hasFakeCaret}
                  />
                ))}
              </div>
            )}
          />
        </div>
      }
    />
  );
};
