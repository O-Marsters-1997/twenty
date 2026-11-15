import { TwoFactorAuthenticationRecoveryCodeExpiryEffect } from '@/settings/two-factor-authentication/components/TwoFactorAuthenticationRecoveryCodeExpiryEffect';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useLingui } from '@lingui/react/macro';
import { IconCopy } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import { beautifyExactDateTime } from '~/utils/date-utils';
import * as stylex from '@stylexjs/stylex';
import { spacing, font } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  codeRow: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  codeInputContainer: {
    flex: '1',
  },
  hint: {
    color: font['--t-font-color-tertiary'],
    fontSize: font['--t-font-size-sm'],
  },
});

type TwoFactorAuthenticationRecoveryCodeDisplayProps = {
  recoveryCode: string;
  expiresAt: string;
  memberName: string;
  onExpire: () => void;
};

export const TwoFactorAuthenticationRecoveryCodeDisplay = ({
  recoveryCode,
  expiresAt,
  memberName,
  onExpire,
}: TwoFactorAuthenticationRecoveryCodeDisplayProps) => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();
  const formattedExpiresAt = beautifyExactDateTime(expiresAt);

  return (
    <div {...stylex.props(styles.container)}>
      <TwoFactorAuthenticationRecoveryCodeExpiryEffect
        expiresAt={expiresAt}
        onExpire={onExpire}
      />
      <div {...stylex.props(styles.codeRow)}>
        <div {...stylex.props(styles.codeInputContainer)}>
          <SettingsTextInput
            instanceId="two-factor-authentication-recovery-code-display"
            value={recoveryCode}
            readOnly
            fullWidth
          />
        </div>
        <Button
          startIcon={<IconCopy />}
          onClick={() =>
            copyToClipboard(recoveryCode, t`Recovery code copied to clipboard`)
          }
        >{t`Copy`}</Button>
      </div>
      <div {...stylex.props(styles.hint)}>
        {t`Share this code with ${memberName} through a channel you trust. It works once and expires at ${formattedExpiresAt}. You won't be able to see it again.`}
      </div>
    </div>
  );
};
