import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  blur,
  borderColor,
  borderRadius,
  boxShadow,
} from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backdropFilter: blur['--t-blur-medium'],
    backgroundColor:
      backgroundTransparent['--t-background-transparent-primary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: boxShadow['--t-box-shadow-strong'],
    display: 'flex',
    overflow: 'hidden',
    zIndex: 30,
  },
  radiusSm: {
    borderRadius: borderRadius['--t-border-radius-sm'],
  },
  dangerBorder: {
    borderColor: borderColor['--t-border-color-danger'],
  },
});

type OverlayContainerProps = ComponentProps<'div'> & {
  borderRadius?: 'sm' | 'md';
  hasDangerBorder?: boolean;
};

export const OverlayContainer = ({
  borderRadius: borderRadiusVariant,
  hasDangerBorder,
  className,
  ...props
}: OverlayContainerProps) => {
  const rootProps = stylex.props(
    styles.root,
    borderRadiusVariant === 'sm' && styles.radiusSm,
    hasDangerBorder === true && styles.dangerBorder,
  );

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
