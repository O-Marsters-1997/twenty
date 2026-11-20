import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { useNavigationSection } from '@/ui/navigation/navigation-drawer/hooks/useNavigationSection';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { Collapsible } from 'twenty-ui/primitives/layout';
import { general } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  items: {
    gap: general['--t-between-siblings-gap'],
    display: 'flex',
    flexDirection: 'column',
  },
});

type CollapsibleNavigationDrawerSectionProps = {
  // Namespaced id (e.g. 'settings/User') used to persist open/closed state.
  sectionId: string;
  label: string;
  children: ReactNode;
  wrapTitle?: (titleNode: ReactNode) => ReactNode;
  rightIcon?: ReactNode;
  alwaysShowRightIcon?: boolean;
};

export const CollapsibleNavigationDrawerSection = ({
  sectionId,
  label,
  children,
  wrapTitle,
  rightIcon,
  alwaysShowRightIcon,
}: CollapsibleNavigationDrawerSectionProps) => {
  const isNavigationDrawerExpanded = useIsNavigationDrawerContentExpanded();
  const { toggleNavigationSection, isNavigationSectionOpen } =
    useNavigationSection(sectionId);

  const titleNode = (
    <NavigationDrawerSectionTitle
      label={label}
      rightIcon={rightIcon}
      alwaysShowRightIcon={alwaysShowRightIcon}
      onClick={toggleNavigationSection}
      isOpen={isNavigationSectionOpen}
    />
  );

  return (
    <NavigationDrawerSection>
      {isNavigationDrawerExpanded &&
        (wrapTitle ? wrapTitle(titleNode) : titleNode)}
      <Collapsible.Root
        open={!isNavigationDrawerExpanded || isNavigationSectionOpen}
      >
        <Collapsible.Panel dimension="height" containAnimation>
          <div {...stylex.props(styles.items)}>{children}</div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </NavigationDrawerSection>
  );
};
