import { OTPInput } from 'input-otp';
import { Controller, useFormContext } from 'react-hook-form';

import { TwoFactorAuthenticationVerificationCodeDash } from '@/settings/two-factor-authentication/components/TwoFactorAuthenticationVerificationCodeDash';
import { TwoFactorAuthenticationVerificationCodeSlot } from '@/settings/two-factor-authentication/components/TwoFactorAuthenticationVerificationCodeSlot';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type OTPFormValues = {
  otp: string;
};

const styles = stylex.create({
  oTPContainer: {
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    marginBottom: spacing['--t-spacing-8'],
    opacity: { default: null, ':has(:disabled)': '0.3' },
  },
});

export const TwoFactorAuthenticationVerificationForSettings = () => {
  const formContext = useFormContext<OTPFormValues>();

  return (
    <Controller
      name="otp"
      control={formContext.control}
      render={({ field: { onChange, onBlur, value } }) => (
        <OTPInput
          maxLength={6}
          onBlur={onBlur}
          onChange={onChange}
          value={value}
          autoFocus
          render={({ slots }) => (
            <div {...stylex.props(styles.oTPContainer)}>
              {slots.slice(0, 3).map((slot, idx) => (
                <TwoFactorAuthenticationVerificationCodeSlot
                  key={idx}
                  char={slot.char}
                  placeholderChar={slot.placeholderChar}
                  isActive={slot.isActive}
                  hasFakeCaret={slot.hasFakeCaret}
                />
              ))}
              <TwoFactorAuthenticationVerificationCodeDash />
              {slots.slice(3).map((slot, idx) => (
                <TwoFactorAuthenticationVerificationCodeSlot
                  key={idx + 3}
                  char={slot.char}
                  placeholderChar={slot.placeholderChar}
                  isActive={slot.isActive}
                  hasFakeCaret={slot.hasFakeCaret}
                />
              ))}
            </div>
          )}
        />
      )}
    />
  );
};
