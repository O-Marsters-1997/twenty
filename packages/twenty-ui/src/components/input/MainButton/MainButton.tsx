import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import { Button } from '@ui/primitives/input/Button/Button';
import { type ButtonProps } from '@ui/primitives/input/Button/types/ButtonProps';
import { ButtonGroupContext } from '@ui/primitives/input/ButtonGroup/internal/ButtonGroupContext';

import { fontWeight, spacing } from '../../../theme/tokens.stylex';

export const MainButton = ({
  elevated = true,
  variant,
  xstyle,
  ...props
}: ButtonProps) => {
  const buttonGroup = useContext(ButtonGroupContext);
  const resolvedVariant = variant ?? buttonGroup?.variant ?? 'solid';

  return (
    <Button
      {...props}
      elevated={elevated}
      variant={resolvedVariant}
      xstyle={[styles.root, xstyle]}
    />
  );
};

const styles = stylex.create({
  root: {
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    paddingInline: spacing['--t-spacing-3'],
  },
});
