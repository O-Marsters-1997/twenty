import * as stylex from '@stylexjs/stylex';

import { fontColor, spacing } from '../tokens.stylex';

const styles = stylex.create({
  root: {
    color: fontColor['--t-font-color-primary'],
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-4'],
  },
});

export const StylexTokenSample = () => (
  <div {...stylex.props(styles.root)}>StyleX tokens</div>
);
