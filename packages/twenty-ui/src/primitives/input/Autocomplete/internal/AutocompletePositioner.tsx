import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';

import { useProvidedTextDirection } from '@ui/utilities/internal/useProvidedTextDirection';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { general } from '../../../../theme/tokens.stylex';
import { type AutocompletePositionerProps } from '../types/AutocompletePositionerProps';

export const AutocompletePositioner = ({
  className,
  xstyle,
  align = 'start',
  sideOffset = 8,
  ...props
}: WithXstyle<AutocompletePositionerProps>) => {
  const direction = useProvidedTextDirection();

  return (
    <AutocompletePrimitive.Positioner
      dir={direction}
      align={align}
      sideOffset={sideOffset}
      {...props}
      {...mergeStylexProps(stylex.props(styles.positioner, xstyle), className)}
    />
  );
};

const styles = stylex.create({
  positioner: { zIndex: general['--t-last-layer-z-index'] },
});
