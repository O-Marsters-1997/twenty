import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { borderColor, borderRadius } from 'twenty-ui/theme/tokens.stylex';

type WidgetContentFrameProps = {
  children?: ReactNode;
  xstyle?: stylex.StyleXStyles;
};

export const WidgetContentFrame = ({
  children,
  xstyle,
}: WidgetContentFrameProps) => (
  <div {...stylex.props(styles.contentFrame, xstyle)}>{children}</div>
);

export const WidgetTableOutline = ({
  children,
  xstyle,
}: WidgetContentFrameProps) => (
  <div {...stylex.props(styles.tableOutline, xstyle)}>{children}</div>
);

const styles = stylex.create({
  contentFrame: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    width: '100%',
  },
  tableOutline: {
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  },
});
