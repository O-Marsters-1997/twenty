import { type ReactNode } from 'react';

import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import * as stylex from '@stylexjs/stylex';
import { useIsMobile } from 'twenty-ui/utilities';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fixedContainer: {
    flexShrink: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  fixedContainerMobile: {
    paddingLeft: spacing['--t-spacing-5'],
    paddingRight: spacing['--t-spacing-5'],
  },
});

export const NavigationDrawerFixedContent = ({
  children,
}: {
  children: ReactNode;
}) => {
  const isMobile = useIsMobile();

  return (
    <div
      {...stylex.props(
        styles.fixedContainer,
        isMobile && styles.fixedContainerMobile,
      )}
    >
      <NavigationDrawerSection>{children}</NavigationDrawerSection>
    </div>
  );
};
