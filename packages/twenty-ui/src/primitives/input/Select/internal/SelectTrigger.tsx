import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { inputStyles } from '@ui/primitives/input/Input/Input.stylex';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  borderColor,
  color,
  fontColor,
  spacing,
} from '../../../../theme/tokens.stylex';
import { selectTriggerMarker } from '../Select.stylex';
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
        styles.trigger,
        xstyle,
      ),
      className,
    )}
  />
);

const styles = stylex.create({
  trigger: {
    alignItems: 'center',
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus': color['--t-color-blue'],
      ':is([data-popup-open])': color['--t-color-blue'],
      ':is([aria-invalid="true"], [data-invalid])':
        borderColor['--t-border-color-danger'],
    },
    boxSizing: 'border-box',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':is([data-disabled])': fontColor['--t-font-color-tertiary'],
    },
    cursor: {
      default: 'pointer',
      ':is([data-disabled])': 'not-allowed',
    },
    display: 'inline-flex',
    gap: spacing['--t-spacing-2'],
    textAlign: 'start',
  },
});
