import { useIsSettingsDrawer } from '@/navigation/hooks/useIsSettingsDrawer';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { type ReactNode } from 'react';
import { useIsMobile } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  itemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '0',
    width: '100%',
  },
  scrollableMobileInnerContainer: {
    height: '100%',
    minHeight: '0',
    paddingLeft: spacing['--t-spacing-5'],
    paddingRight: spacing['--t-spacing-5'],
  },
  scrollWrapper: {
    flex: '1 1 auto',
    minHeight: 0,
  },
});

export const NavigationDrawerScrollableContent = ({
  children,
}: {
  children: ReactNode;
}) => {
  const isSettingsDrawer = useIsSettingsDrawer();
  const isMobile = useIsMobile();

  return (
    <ScrollWrapper
      className={stylex.props(styles.scrollWrapper).className}
      componentInstanceId={`scroll-wrapper-${
        isSettingsDrawer ? 'settings-' : ''
      }navigation-drawer`}
      defaultEnableXScroll={false}
    >
      <div {...stylex.props(styles.itemsContainer)}>
        {isMobile ? (
          <div {...stylex.props(styles.scrollableMobileInnerContainer)}>
            {children}
          </div>
        ) : (
          <>{children}</>
        )}
      </div>
    </ScrollWrapper>
  );
};
