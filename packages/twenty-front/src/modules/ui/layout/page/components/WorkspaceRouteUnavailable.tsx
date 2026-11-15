import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-6'],
    paddingRight: spacing['--t-spacing-6'],
    paddingBottom: spacing['--t-spacing-6'],
    paddingLeft: spacing['--t-spacing-6'],
    textAlign: 'center',
  },
});

export const WorkspaceRouteUnavailable = ({
  children,
}: {
  children?: ReactNode;
}) => {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.container)}>
      {children ?? t`This page isn't available.`}
    </div>
  );
};
