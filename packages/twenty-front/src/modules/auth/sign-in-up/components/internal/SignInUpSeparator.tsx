import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  signInUpSeparator: {
    marginBlock: spacing['--t-spacing-3'],
  },
});

export const SignInUpSeparator = () => {
  return <div {...stylex.props(styles.signInUpSeparator)} />;
};
