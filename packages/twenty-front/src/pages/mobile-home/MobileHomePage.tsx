import { MobileHomeAiChatSection } from '@/ai/components/MobileHomeAiChatSection';
import { MainNavigationDrawerNavigationContent } from '@/navigation/components/MainNavigationDrawerNavigationContent';
import { useDefaultHomePagePath } from '@/navigation/hooks/useDefaultHomePagePath';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { MultiWorkspaceDropdownButton } from '@/navigation/components/MultiWorkspaceDropdown/MultiWorkspaceDropdownButton';
import { NavigationDrawerFixedContent } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerFixedContent';
import { NavigationDrawerScrollableContent } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerScrollableContent';
import { useIsMobile } from 'twenty-ui/utilities';
import { Navigate } from 'react-router-dom';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-4'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '0',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: spacing['--t-spacing-2'],
    width: '100%',
  },
  sections: {
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
  },
});

export const MobileHomePage = () => {
  const isMobile = useIsMobile();
  const { defaultHomePagePath } = useDefaultHomePagePath();
  const hasAiPermission = useHasPermissionFlag(PermissionFlagType.AI);

  // Desktop keeps the drawer, so the page has nothing to show there.
  if (!isMobile) {
    return <Navigate to={defaultHomePagePath} replace />;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <NavigationDrawerFixedContent>
        <MultiWorkspaceDropdownButton />
      </NavigationDrawerFixedContent>

      <NavigationDrawerScrollableContent>
        <div {...stylex.props(styles.sections)}>
          <MainNavigationDrawerNavigationContent />
          {hasAiPermission && <MobileHomeAiChatSection />}
        </div>
      </NavigationDrawerScrollableContent>
    </div>
  );
};
