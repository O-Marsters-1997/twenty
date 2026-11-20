import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { general, spacing } from 'twenty-ui/theme/tokens.stylex';
import { useIsMobile } from 'twenty-ui/utilities';

const styles = stylex.create({
  section: {
    width: '100%',
  },
  innerContainer: {
    gap: general['--t-between-siblings-gap'],
    display: 'flex',
    flexDirection: 'column',
    width: `calc(100% - ${spacing['--t-spacing-2']})`,
  },
  innerContainerFull: {
    width: '100%',
  },
});

export const NavigationDrawerSection = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isMobile = useIsMobile();
  const isNavigationDrawerExpanded = useAtomStateValue(
    isNavigationDrawerExpandedState,
  );
  const isCollapsed = !isMobile && !isNavigationDrawerExpanded;

  return (
    <div {...stylex.props(styles.section)}>
      <div
        {...stylex.props(
          styles.innerContainer,
          (isMobile || isCollapsed) && styles.innerContainerFull,
        )}
      >
        {children}
      </div>
    </div>
  );
};
