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
    gap: spacing['--t-spacing-8'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
    width: '100%',
  },
  content: {
    gap: spacing['--t-spacing-4'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
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
    overflow: 'hidden',
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    maxHeight: '2.4em',
  },
});

type ErrorStateSectionProps = {
  children?: ReactNode;
};

type ErrorStateRootProps = ErrorStateSectionProps;

const ErrorStateRoot = ({ children }: ErrorStateRootProps) => (
  <div {...stylex.props(styles.root)}>{children}</div>
);

type ErrorStateContentProps = ErrorStateSectionProps;

const ErrorStateContent = ({ children }: ErrorStateContentProps) => (
  <div {...stylex.props(styles.content)}>{children}</div>
);

type ErrorStateTitleProps = ErrorStateSectionProps;

const ErrorStateTitle = ({ children }: ErrorStateTitleProps) => (
  <div {...stylex.props(styles.title)}>{children}</div>
);

type ErrorStateDescriptionProps = ErrorStateSectionProps;

const ErrorStateDescription = ({ children }: ErrorStateDescriptionProps) => (
  <div {...stylex.props(styles.description)}>{children}</div>
);

export const ErrorState = {
  Root: ErrorStateRoot,
  Content: ErrorStateContent,
  Title: ErrorStateTitle,
  Description: ErrorStateDescription,
};
