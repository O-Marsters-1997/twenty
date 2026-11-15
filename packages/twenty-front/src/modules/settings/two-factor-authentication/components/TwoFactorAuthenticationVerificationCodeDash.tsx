import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  dashContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    width: spacing['--t-spacing-2'],
  },
  dash: {
    backgroundColor: fontColor['--t-font-color-light'],
    height: '1.6px',
    width: spacing['--t-spacing-1_5'],
  },
});

export const TwoFactorAuthenticationVerificationCodeDash = () => {
  return (
    <div {...stylex.props(styles.dashContainer)}>
      <div {...stylex.props(styles.dash)} />
    </div>
  );
};
