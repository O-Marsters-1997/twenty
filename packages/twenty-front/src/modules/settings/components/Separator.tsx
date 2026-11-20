import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  hr: {
    borderStyle: 'none',
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    marginBottom: '0px',
    marginLeft: spacing['--t-spacing-4'],
    marginRight: spacing['--t-spacing-4'],
    marginTop: '0px',
  },
});

export const Separator = () => {
  return <hr {...stylex.props(styles.hr)} />;
};
