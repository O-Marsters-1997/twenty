import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  boxShadow,
  general,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    backdropFilter: 'blur(20px)',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-secondary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: boxShadow['--t-box-shadow-strong'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    maxWidth: 'calc(100vw - 16px)',
    padding: spacing['--t-spacing-2'],
    width: '300px',
    zIndex: general['--t-last-layer-z-index'],
  },
});

export const StyledInformationCard = ({
  className,
  ...props
}: ComponentProps<'div'>) => {
  const rootProps = stylex.props(styles.root);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
