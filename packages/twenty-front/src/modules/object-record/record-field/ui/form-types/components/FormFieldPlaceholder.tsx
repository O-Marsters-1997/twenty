import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { fontColor, fontSize, fontWeight } from 'twenty-ui/theme/tokens.stylex';

export const FormFieldPlaceholder = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.placeholder)}>{children}</div>;

const styles = stylex.create({
  placeholder: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
});
