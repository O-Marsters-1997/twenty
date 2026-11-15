import * as stylex from '@stylexjs/stylex';
import { IconChevronRight } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import { animationDuration } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  container: {
    display: 'inline-flex',
    transform: 'rotate(0deg)',
    transitionDuration: {
      default: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
      [media.reducedMotion]: '0s',
    },
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease',
  },
  open: { transform: 'rotate(90deg)' },
});

type NavigationMenuItemFolderChevronProps = {
  isOpen: boolean;
};

export const NavigationMenuItemFolderChevron = ({
  isOpen,
}: NavigationMenuItemFolderChevronProps) => {
  const theme = useTheme();

  return (
    <span {...stylex.props(styles.container, isOpen && styles.open)}>
      <IconChevronRight
        size={theme.icon.size.sm}
        stroke={theme.icon.stroke.sm}
        color={themeCssVariables.font.color.tertiary}
      />
    </span>
  );
};
