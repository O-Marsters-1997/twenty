import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import { Button } from '@ui/primitives/input/Button/Button';
import { ButtonGroupContext } from '@ui/primitives/input/ButtonGroup/internal/ButtonGroupContext';
import { mergeXstyles } from '@ui/utilities/internal/mergeXstyles';

import { fontColor, fontWeight } from '../../../theme/tokens.stylex';
import { type LightButtonProps } from './types/LightButtonProps';

export const LightButton = ({
  color,
  emphasis = 'standard',
  size,
  variant,
  xstyle,
  ...props
}: LightButtonProps) => {
  const buttonGroup = useContext(ButtonGroupContext);
  const resolvedSize = size ?? buttonGroup?.size ?? 'sm';
  const resolvedVariant = variant ?? buttonGroup?.variant ?? 'ghost';
  const resolvedColor = color ?? buttonGroup?.color ?? 'neutral';
  const isSubtleNeutral =
    emphasis === 'subtle' &&
    resolvedColor === 'neutral' &&
    resolvedVariant !== 'solid';

  return (
    <Button
      {...props}
      color={color}
      size={resolvedSize}
      variant={resolvedVariant}
      data-emphasis={emphasis}
      xstyle={mergeXstyles(
        styles.root,
        isSubtleNeutral && styles.subtleNeutral,
        xstyle,
      )}
    />
  );
};

const styles = stylex.create({
  root: { fontWeight: fontWeight['--t-font-weight-regular'] },
  subtleNeutral: { '--tw-button-color': fontColor['--t-font-color-tertiary'] },
});
