import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-8'],
    height: '100%',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  content: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xl'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
  },
  description: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    maxHeight: '2.4em',
    overflow: 'hidden',
  },
});

type ErrorStateSectionProps = {
  children?: ReactNode;
};

const ErrorStateRoot = ({ children }: ErrorStateSectionProps) => (
  <div {...stylex.props(styles.root)}>{children}</div>
);

const ErrorStateContent = ({ children }: ErrorStateSectionProps) => (
  <div {...stylex.props(styles.content)}>{children}</div>
);

const ErrorStateTitle = ({ children }: ErrorStateSectionProps) => (
  <div {...stylex.props(styles.title)}>{children}</div>
);

const ErrorStateDescription = ({ children }: ErrorStateSectionProps) => (
  <div {...stylex.props(styles.description)}>{children}</div>
);

export const ErrorState = {
  Root: ErrorStateRoot,
  Content: ErrorStateContent,
  Title: ErrorStateTitle,
  Description: ErrorStateDescription,
};
