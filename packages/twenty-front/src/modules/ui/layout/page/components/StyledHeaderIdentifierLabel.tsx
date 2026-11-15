import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  label: {
    color: fontColor['--t-font-color-tertiary'],
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-md'],
    whiteSpace: 'nowrap',
  },
});

export const StyledHeaderIdentifierLabel = ({
  children,
}: {
  children?: ReactNode;
}) => <span {...stylex.props(styles.label)}>{children}</span>;
