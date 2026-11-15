import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { inputStyles } from '@ui/primitives/input/Input/Input.stylex';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { selectTriggerMarker, selectTriggerStyles } from '../Select.stylex';
import { type SelectTriggerProps } from '../types/SelectTriggerProps';

export const SelectTrigger = ({
  size = 'md',
  className,
  xstyle,
  ...props
}: WithXstyle<SelectTriggerProps>) => (
  <SelectPrimitive.Trigger
    {...props}
    {...mergeStylexProps(
      stylex.props(
        selectTriggerMarker,
        inputStyles.input,
        size === 'sm' && inputStyles.sizeSm,
        selectTriggerStyles.trigger,
        xstyle,
      ),
      className,
    )}
  />
);
