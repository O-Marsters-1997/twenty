import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  subTitle: {
    color: fontColor['--t-font-color-secondary'],
    textAlign: 'center',
  },
});

export const SubTitle = ({ children }: { children?: ReactNode }) => (
  <div {...stylex.props(styles.subTitle)}>{children}</div>
);
