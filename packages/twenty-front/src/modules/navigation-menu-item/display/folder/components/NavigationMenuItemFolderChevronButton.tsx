import * as stylex from '@stylexjs/stylex';
import { useLingui } from '@lingui/react/macro';
import type React from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronRight } from 'twenty-ui/icon';
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

type NavigationMenuItemFolderChevronButtonProps = {
  isOpen: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const NavigationMenuItemFolderChevronButton = ({
  isOpen,
  onClick,
}: NavigationMenuItemFolderChevronButtonProps) => {
  const { t } = useLingui();

  return (
    <span {...stylex.props(styles.container, isOpen && styles.open)}>
      <LightIconButton
        size="sm"
        emphasis="subtle"
        aria-label={isOpen ? t`Collapse folder` : t`Expand folder`}
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <IconChevronRight />
      </LightIconButton>
    </span>
  );
};
