import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderRadius,
  color,
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
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    paddingBlock: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    userSelect: 'none',
  },
  unfolded: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':hover': backgroundTransparent['--t-background-transparent-medium'],
    },
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  active: {
    color: color['--t-color-blue'],
  },
});

type StyledDropdownButtonContainerProps = ComponentProps<'div'> & {
  isUnfolded: boolean;
  isActive?: boolean;
  transparentBackground?: boolean;
};

export const StyledDropdownButtonContainer = ({
  isUnfolded,
  isActive,
  transparentBackground,
  className,
  ...props
}: StyledDropdownButtonContainerProps) => {
  const rootProps = stylex.props(
    styles.root,
    isUnfolded && styles.unfolded,
    transparentBackground && styles.transparent,
    isActive && styles.active,
  );

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
