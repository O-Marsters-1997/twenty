import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

export const Table = ({ className, ...props }: ComponentProps<'div'>) => {
  const rootProps = stylex.props(styles.table);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
