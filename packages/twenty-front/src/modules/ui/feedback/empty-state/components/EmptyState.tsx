import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  animationDuration,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const styles = stylex.create({
  root: {
    alignItems: 'center',
    animationDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    animationName: fadeIn,
    animationTimingFunction: 'ease',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-6'],
    height: '100%',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  rootWidth: (width: number) => ({
    width: `${width}px`,
  }),
  content: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-lg'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  description: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
    maxHeight: '2.8em',
    overflow: 'hidden',
    width: '50%',
  },
});

type EmptyStateRootProps = {
  children?: ReactNode;
  width?: number;
  className?: string;
};

type EmptyStateSectionProps = {
  children?: ReactNode;
};

const EmptyStateRoot = ({ children, width, className }: EmptyStateRootProps) => {
  const rootProps = stylex.props(
    styles.root,
    isDefined(width) && styles.rootWidth(width),
  );

  return (
    <div
      {...rootProps}
      className={[rootProps.className, className].filter(isDefined).join(' ')}
    >
      {children}
    </div>
  );
};

const EmptyStateContent = ({ children }: EmptyStateSectionProps) => (
  <div {...stylex.props(styles.content)}>{children}</div>
);

const EmptyStateTitle = ({ children }: EmptyStateSectionProps) => (
  <div {...stylex.props(styles.title)}>{children}</div>
);

const EmptyStateDescription = ({ children }: EmptyStateSectionProps) => (
  <div {...stylex.props(styles.description)}>{children}</div>
);

export const EmptyState = {
  Root: EmptyStateRoot,
  Content: EmptyStateContent,
  Title: EmptyStateTitle,
  Description: EmptyStateDescription,
};
