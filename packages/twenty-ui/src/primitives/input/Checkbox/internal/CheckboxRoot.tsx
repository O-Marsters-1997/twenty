import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import {
  checkboxColorStyles,
  checkboxShapeStyles,
  checkboxSizeStyles,
  checkboxStyles,
  checkboxVariantStyles,
} from '../Checkbox.stylex';
import { type CheckboxRootProps } from '../types/CheckboxRootProps';

export const CheckboxRoot = ({
  size = 'sm',
  variant = 'solid',
  shape = 'square',
  color: colorProp = 'accent',
  hoverable = true,
  className,
  xstyle,
  ...props
}: WithXstyle<CheckboxRootProps>) => (
  <CheckboxPrimitive.Root
    {...props}
    {...mergeStylexProps(
      stylex.props(
        focusStyles.ring,
        checkboxStyles.root,
        checkboxSizeStyles[size],
        checkboxVariantStyles[variant],
        size === 'md' && variant !== 'soft' && checkboxStyles.mdBorder,
        checkboxShapeStyles[shape],
        checkboxColorStyles[colorProp],
        hoverable && checkboxStyles.hoverable,
        hoverable && size === 'md' && checkboxStyles.hoverableMd,
        xstyle,
      ),
      className,
    )}
  />
);
