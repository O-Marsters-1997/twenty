import { useIsSettingsDrawer } from '@/navigation/hooks/useIsSettingsDrawer';
import { useNavigationDrawerTogglePresentation } from '@/ui/navigation/navigation-drawer/hooks/useNavigationDrawerTogglePresentation';
import { useToggleNavigationDrawer } from '@/ui/navigation/navigation-drawer/hooks/useToggleNavigationDrawer';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useNavigationDrawerExpandButtonFocusHandOff } from '@/ui/navigation/navigation-drawer/hooks/useNavigationDrawerExpandButtonFocusHandOff';
import { useIsMobile } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { LightIconButton } from 'twenty-ui/components/input';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { borderRadius, fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  collapseButton: {
    borderRadius: borderRadius['--t-border-radius-md'],
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    userSelect: 'none',
  },
});

type NavigationDrawerCollapseButtonProps = {
  direction?: 'left' | 'right';
};

export const NavigationDrawerCollapseButton = ({
  direction = 'left',
}: NavigationDrawerCollapseButtonProps) => {
  const isMobile = useIsMobile();
  const isSettingsDrawer = useIsSettingsDrawer();
  const { toggleNavigationDrawer } = useToggleNavigationDrawer();
  const { label, Icon } = useNavigationDrawerTogglePresentation(
    direction === 'left',
  );
  const expandButtonFocusHandOffRef =
    useNavigationDrawerExpandButtonFocusHandOff();

  // The main navigation is a page on mobile, so there is no drawer to toggle.
  if (isMobile && !isSettingsDrawer) {
    return null;
  }

  return (
    <Tooltip
      content={label}
      delay={TooltipDelay.longDelay}
      side="bottom"
      sideOffset={5}
    >
      <div {...stylex.props(styles.collapseButton)}>
        <LightIconButton
          ref={direction === 'right' ? expandButtonFocusHandOffRef : undefined}
          emphasis="standard"
          size="sm"
          onClick={toggleNavigationDrawer}
          aria-label={label}
        >
          <Icon />
        </LightIconButton>
      </div>
    </Tooltip>
  );
};
