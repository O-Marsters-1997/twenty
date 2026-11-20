import { rowMarker } from './NavigationMenuItemRow.stylex';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconDotsVertical } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  actions: {
    alignItems: 'center',
    display: 'flex',
    opacity: {
      default: '0',
      [stylex.when.ancestor(':hover', rowMarker)]: '1',
      [stylex.when.ancestor(':focus-within', rowMarker)]: '1',
    },
    pointerEvents: {
      default: 'none',
      [stylex.when.ancestor(':hover', rowMarker)]: 'auto',
      [stylex.when.ancestor(':focus-within', rowMarker)]: 'auto',
    },
    position: 'absolute',
    bottom: spacing['--t-spacing-0_5'],
    right: spacing['--t-spacing-0_5'],
  },
});

type NavigationMenuItemRowActionsProps = {
  rightOptions?: ReactNode;
  onOpenActions: () => void;
};

export const NavigationMenuItemRowActions = ({
  rightOptions,
  onOpenActions,
}: NavigationMenuItemRowActionsProps) => {
  const { t } = useLingui();

  return (
    <div
      data-navigation-actions
      onMouseDown={(event) => event.stopPropagation()}
      {...stylex.props(styles.actions)}
    >
      {rightOptions}
      <LightIconButton
        size="sm"
        emphasis="subtle"
        aria-label={t`Menu item actions`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenActions();
        }}
      >
        <IconDotsVertical />
      </LightIconButton>
    </div>
  );
};
