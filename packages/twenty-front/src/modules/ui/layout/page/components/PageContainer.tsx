import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

type PageContainerProps = ComponentProps<'div'>;

export const PageContainer = ({ className, ...props }: PageContainerProps) => {
  const rootProps = stylex.props(styles.container);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
