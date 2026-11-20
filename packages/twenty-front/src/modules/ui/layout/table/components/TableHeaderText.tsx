import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  text: {
    paddingBottom: spacing['--t-spacing-0_5'],
  },
});

type TableHeaderTextProps = ComponentProps<'div'>;

export const TableHeaderText = ({
  className,
  ...props
}: TableHeaderTextProps) => {
  const rootProps = stylex.props(styles.text);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
