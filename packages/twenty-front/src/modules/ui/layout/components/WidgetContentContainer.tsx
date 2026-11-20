import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: 'var(--widget-height, 100%)',
    minHeight: 0,
    width: '100%',
  },
  scroll: {
    overflow: 'var(--widget-scroll-overflow, auto)',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
  },
});

export const StyledWidgetContentContainer = ({
  className,
  ...props
}: StyledWidgetContentContainerProps<'div'>) => {
  const rootProps = stylex.props(styles.container);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};

export const StyledWidgetScrollContainer = ({
  className,
  ...props
}: StyledWidgetScrollContainerProps<'div'>) => {
  const rootProps = stylex.props(styles.container, styles.scroll);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
