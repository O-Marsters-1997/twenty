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
    padding: spacing['--t-spacing-2'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-1'],
    backdropFilter: 'blur(20px)',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-secondary'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    zIndex: general['--t-last-layer-z-index'],
    maxWidth: 'calc(100vw - 16px)',
    width: '300px',
  },
});

type StyledInformationCardProps = ComponentProps<'div'>;

export const StyledInformationCard = ({
  className,
  ...props
}: StyledInformationCardProps) => {
  const rootProps = stylex.props(styles.root);

  return (
    <div
      {...props}
      {...rootProps}
      className={[rootProps.className, className].join(' ')}
    />
  );
};
