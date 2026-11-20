import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

type TableProps = ComponentProps<'div'>;

export const Table = ({ className, ...props }: TableProps) => {
  const rootProps = stylex.props(styles.table);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
