import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'flex',
    minHeight: '32px',
    minWidth: 'max(200px, var(--field-input-anchor-width, 0px))',
    width: '100%',
  },
});

type FieldInputContainerProps = {
  children?: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

export const FieldInputContainer = ({
  children,
  xstyle,
}: FieldInputContainerProps) => (
  <div {...stylex.props(styles.root, xstyle)}>{children}</div>
);
