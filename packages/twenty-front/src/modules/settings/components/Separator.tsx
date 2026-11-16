import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  hr: {
    borderStyle: 'none',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: borderColor['--t-border-color-light'],
    marginTop: '0px',
    marginRight: spacing['--t-spacing-4'],
    marginBottom: '0px',
    marginLeft: spacing['--t-spacing-4'],
  },
});

export const Separator = () => {
  return <hr {...stylex.props(styles.hr)} />;
};
