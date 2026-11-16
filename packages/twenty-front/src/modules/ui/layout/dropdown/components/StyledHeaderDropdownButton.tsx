import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: {
      default: background['--t-background-primary'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'none',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-2'],
    userSelect: 'none',
  },
  unfolded: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':hover': backgroundTransparent['--t-background-transparent-medium'],
    },
  },
});

type StyledHeaderDropdownButtonProps = ComponentProps<'button'> & {
  isUnfolded?: boolean;
};

export const StyledHeaderDropdownButton = ({
  isUnfolded,
  className,
  ...props
}: StyledHeaderDropdownButtonProps) => {
  const rootProps = stylex.props(styles.root, isUnfolded && styles.unfolded);

  return (
    <button
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
