import { TwoFactorAuthenticationRecoveryCodeExpiryEffect } from '@/settings/two-factor-authentication/components/TwoFactorAuthenticationRecoveryCodeExpiryEffect';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useLingui } from '@lingui/react/macro';
import { IconCopy } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import { beautifyExactDateTime } from '~/utils/date-utils';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  codeRow: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
  },
  codeInputContainer: {
    flex: '1',
  },
  hint: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
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
