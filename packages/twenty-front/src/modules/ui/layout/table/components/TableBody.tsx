import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  body: {
    gap: '2px',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: 0,
    display: 'flex',
    flexDirection: 'column',
  },
});

export const TableBody = ({ className, ...props }: TableBodyProps<'div'>) => {
  const rootProps = stylex.props(styles.body);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
