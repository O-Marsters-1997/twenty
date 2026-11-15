import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  fieldContainer: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
  },
});

export const StopPropagationContainer = ({
  children,
}: {
  children: ReactNode;
}) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
    }}
    {...stylex.props(styles.fieldContainer)}
  >
    {children}
  </div>
);
