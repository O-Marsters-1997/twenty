import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { useProvidedTextDirection } from '@ui/primitives/layout/DirectionProvider/internal/useProvidedTextDirection';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { general } from '../../../../theme/tokens.stylex';
import { type SelectPositionerProps } from '../types/SelectPositionerProps';

export const SelectPositioner = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SelectPositionerProps>) => {
  const direction = useProvidedTextDirection();

  return (
    <SelectPrimitive.Positioner
      dir={direction}
      {...props}
      {...mergeStylexProps(stylex.props(styles.positioner, xstyle), className)}
    />
  );
};

const styles = stylex.create({
  positioner: { zIndex: general['--t-last-layer-z-index'] },
});
