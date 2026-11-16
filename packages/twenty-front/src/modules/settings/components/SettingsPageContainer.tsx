import { SETTINGS_CONTENT_MAX_WIDTH } from '@/settings/constants/SettingsContentMaxWidth';
import { useIsMobile } from 'twenty-ui/utilities';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { useScrollRestoration } from '@/ui/utilities/scroll/hooks/useScrollRestoration';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const SETTINGS_PATHS_BY_LENGTH = Object.values(SettingsPath).sort(
  (a, b) => b.length - a.length,
);

const getMatchingSettingsPath = (pathname: string) =>
  SETTINGS_PATHS_BY_LENGTH.find((path) => {
    const settingsPath = getSettingsPath(path);
    const match = matchPath(settingsPath, pathname);

    return isDefined(match);
  });

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-8'],
    marginBottom: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: 0,
    paddingBottom: spacing['--t-spacing-20'],
    paddingLeft: spacing['--t-spacing-8'],
    paddingRight: spacing['--t-spacing-8'],
    paddingTop: spacing['--t-spacing-6'],
    width: '100%',
  },
  maxWidth: (maxWidth: number) => ({ maxWidth }),
  inSidePanel: {
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
  mobile: {
    width: 'unset',
  },
  overflowAuto: {
    overflow: 'auto',
  },
  overflowVisible: {
    overflow: 'visible',
  },
});

export const SettingsPageContainer = ({
  children,
  overflow = 'auto',
}: {
  children: ReactNode;
  overflow?: 'auto' | 'visible';
}) => {
  const isMobile = useIsMobile();
  const workspaceSurface = useWorkspaceSurface();
  const location = useLocation();
  const settingsPath = getMatchingSettingsPath(location.pathname);

  const componentInstanceId = useWorkspaceSurfaceScopedComponentInstanceId(
    `scroll-wrapper-settings-page-container-${settingsPath}`,
  );

  useScrollRestoration(componentInstanceId);

  return (
    <ScrollWrapper componentInstanceId={componentInstanceId}>
      <div
        {...stylex.props(
          styles.root,
          styles.maxWidth(SETTINGS_CONTENT_MAX_WIDTH),
          workspaceSurface.type === 'side-panel' && styles.inSidePanel,
          isMobile && styles.mobile,
          overflow === 'visible' ? styles.overflowVisible : styles.overflowAuto,
        )}
      >
        {children}
      </div>
    </ScrollWrapper>
  );
};
