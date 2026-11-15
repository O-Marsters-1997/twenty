import * as stylex from '@stylexjs/stylex';

import { IconCheck } from '@ui/icon';
import {
  checkboxColorStyles,
  checkboxShapeStyles,
  checkboxSizeStyles,
  checkboxStyles,
  checkboxVariantStyles,
} from '@ui/primitives/input/Checkbox/Checkbox.stylex';

type ListItemCheckboxIndicatorProps = {
  checked: boolean;
  disabled: boolean;
};

export const ListItemCheckboxIndicator = ({
  checked,
  disabled,
}: ListItemCheckboxIndicatorProps) => (
  <span
    aria-hidden
    {...stylex.props(
      checkboxStyles.root,
      checkboxSizeStyles.sm,
      checkboxVariantStyles.solid,
      checkboxShapeStyles.square,
      checkboxColorStyles.accent,
    )}
    data-checked={checked || undefined}
    data-disabled={disabled || undefined}
  >
    {checked && (
      <span {...stylex.props(checkboxStyles.listIndicator)}>
        <IconCheck aria-hidden />
      </span>
    )}
  </span>
);
