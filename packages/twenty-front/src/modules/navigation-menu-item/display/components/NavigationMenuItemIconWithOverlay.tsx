import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  borderRadius,
  grayScale,
  iconSize,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  compositeContainer: {
    alignItems: 'center',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    height: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    justifyContent: 'center',
    position: 'relative',
    width: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: grayScale['--t-gray-scale-gray4'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    bottom: '-5px',
    display: 'flex',
    height: '14px',
    justifyContent: 'center',
    position: 'absolute',
    right: '-6px',
    width: '12px',
  },
});

type NavigationMenuItemIconWithOverlayProps = {
  children: ReactNode;
  OverlayIcon: IconComponent;
};

export const NavigationMenuItemIconWithOverlay = ({
  children,
  OverlayIcon,
}: NavigationMenuItemIconWithOverlayProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.compositeContainer)}>
      {children}
      <div {...stylex.props(styles.overlay)}>
        <OverlayIcon
          size="12px"
          stroke={theme.icon.stroke.md}
          color={themeCssVariables.grayScale.gray10}
        />
      </div>
    </div>
  );
};
