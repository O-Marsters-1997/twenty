import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  formContainer: {
    paddingInline: spacing['--t-spacing-1'],
  },
});

export const SidePanelGroupFormContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <div {...stylex.props(styles.formContainer)}>{children}</div>;
};
