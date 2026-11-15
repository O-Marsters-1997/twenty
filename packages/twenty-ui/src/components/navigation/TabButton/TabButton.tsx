import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import { Button } from '@ui/primitives/input/Button/Button';
import { ButtonGroupContext } from '@ui/primitives/input/ButtonGroup/internal/ButtonGroupContext';
import { TabsTabContent } from '@ui/primitives/navigation/internal/tab/TabsTabContent';
import { mergeClassNames } from '@ui/utilities/internal/mergeClassNames';

import tabStyles from '@ui/primitives/navigation/internal/tab/Tab.module.scss';
import { borderColor, spacing } from '../../../theme/tokens.stylex';
import { type TabButtonProps } from './types/TabButtonProps';

export const TabButton = ({
  active = false,
  className,
  xstyle,
  children,
  startIcon,
  endIcon,
  badge,
  size,
  ...props
}: TabButtonProps) => {
  const buttonGroup = useContext(ButtonGroupContext);
  const resolvedSize = size ?? buttonGroup?.size ?? 'sm';

  return (
    <Button
      {...props}
      variant="ghost"
      size={resolvedSize}
      data-active={active || undefined}
      className={mergeClassNames(tabStyles.tab, className)}
      xstyle={[styles.root, active && styles.active, xstyle]}
    >
      <TabsTabContent startIcon={startIcon} endIcon={endIcon} badge={badge}>
        {children}
      </TabsTabContent>
    </Button>
  );
};

const styles = stylex.create({
  root: {
    '--tw-button-active': 'transparent',
    '--tw-button-hover': 'transparent',
    '--tw-button-radius': 0,
    blockSize: 'auto',
    borderWidth: 0,
    color: 'var(--tw-tabs-color)',
    display: 'flex',
    minBlockSize: spacing['--t-spacing-10'],
    opacity: 1,
    paddingBlock: 0,
    paddingInline: 0,
    '::after': {
      backgroundColor: 'transparent',
      blockSize: 1,
      content: '""',
      insetBlockEnd: 0,
      insetInline: 0,
      pointerEvents: 'none',
      position: 'absolute',
      zIndex: 1,
    },
  },
  active: {
    '::after': { backgroundColor: borderColor['--t-border-color-inverted'] },
  },
});
