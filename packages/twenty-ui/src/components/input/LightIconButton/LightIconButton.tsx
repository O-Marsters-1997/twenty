import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import { IconButton } from '@ui/components/input/IconButton/IconButton';
import { ButtonGroupContext } from '@ui/primitives/input/ButtonGroup/internal/ButtonGroupContext';
import { mergeXstyles } from '@ui/utilities/internal/mergeXstyles';

import { fontColor, iconSize } from '../../../theme/tokens.stylex';
import { type LightIconButtonProps } from './types/LightIconButtonProps';

export const LightIconButton = ({
  color,
  disabled,
  emphasis = 'standard',
  loading,
  size,
  variant,
  xstyle,
  ...props
}: LightIconButtonProps) => {
  const buttonGroup = useContext(ButtonGroupContext);
  const resolvedSize = size ?? buttonGroup?.size ?? 'sm';
  const resolvedVariant = variant ?? buttonGroup?.variant ?? 'ghost';
  const resolvedColor = color ?? buttonGroup?.color ?? 'neutral';
  const isSubtleNeutral =
    emphasis === 'subtle' &&
    resolvedColor === 'neutral' &&
    resolvedVariant !== 'solid';
  const isDisabledNeutralGhost =
    (disabled === true || loading === true) &&
    resolvedColor === 'neutral' &&
    resolvedVariant === 'ghost';

  return (
    <IconButton
      {...props}
      color={color}
      disabled={disabled}
      loading={loading}
      size={resolvedSize}
      variant={resolvedVariant}
      data-emphasis={emphasis}
      xstyle={mergeXstyles(
        styles.root,
        resolvedSize === 'md' && styles.sizeMd,
        isSubtleNeutral && styles.subtleNeutral,
        isDisabledNeutralGhost && styles.disabledNeutralGhost,
        xstyle,
      )}
    />
  );
};

const styles = stylex.create({
  root: { '--tw-icon-button-icon-size': iconSize['--t-icon-size-sm'] },
  sizeMd: { '--tw-icon-button-icon-size': iconSize['--t-icon-size-md'] },
  subtleNeutral: { '--tw-button-color': fontColor['--t-font-color-tertiary'] },
  disabledNeutralGhost: {
    '--tw-button-color': fontColor['--t-font-color-extra-light'],
    opacity: 1,
  },
});
