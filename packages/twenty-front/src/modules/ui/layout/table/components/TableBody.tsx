import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: 0,
  },
});

export const TableBody = ({ className, ...props }: ComponentProps<'div'>) => {
  const rootProps = stylex.props(styles.body);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
