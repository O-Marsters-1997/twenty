import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  borderColor,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type NestedSettingsRowProps = {
  children: ReactNode;
  isLast?: boolean;
  guideOffset?: string;
};

// Settings rows own their top padding, so the guide covers that inset too.
export const NestedSettingsRow = ({
  children,
  isLast = false,
  guideOffset = '50%',
}: NestedSettingsRowProps) => (
  <div {...stylex.props(styles.nestedRow)}>
    <div aria-hidden="true" {...stylex.props(styles.guide)}>
      <div {...stylex.props(styles.line, isLast && styles.lineHidden)} />
      <div {...stylex.props(styles.elbow, styles.elbowHeight(guideOffset))} />
    </div>
    {children}
  </div>
);

const styles = stylex.create({
  nestedRow: {
    position: 'relative',
    marginLeft: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-4'],
  },
  guide: {
    pointerEvents: 'none',
    position: 'absolute',
    bottom: 0,
    left: 0,
    top: 0,
    width: spacing['--t-spacing-4'],
  },
  line: {
    backgroundColor: borderColor['--t-border-color-strong'],
    display: 'block',
    position: 'absolute',
    bottom: 0,
    left: 0,
    top: 0,
    width: 1,
  },
  lineHidden: {
    display: 'none',
  },
  elbow: {
    boxSizing: 'border-box',
    position: 'absolute',
    borderBottomColor: borderColor['--t-border-color-strong'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderLeftColor: borderColor['--t-border-color-strong'],
    borderLeftStyle: 'solid',
    borderLeftWidth: 1,
    left: 0,
    top: 0,
    width: '100%',
  },
  elbowHeight: (height: string) => ({ height }),
});
