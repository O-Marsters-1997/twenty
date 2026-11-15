import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { checkboxIndicatorMarker } from '../Checkbox.stylex';
import { type CheckboxIndicatorProps } from '../types/CheckboxIndicatorProps';

export const CheckboxIndicator = ({
  className,
  xstyle,
  ...props
}: WithXstyle<CheckboxIndicatorProps>) => (
  <CheckboxPrimitive.Indicator
    {...props}
    {...mergeStylexProps(
      stylex.props(checkboxIndicatorMarker, styles.indicator, xstyle),
      className,
    )}
  />
);

const styles = stylex.create({
  indicator: {
    blockSize: 'var(--tw-checkbox-icon-size)',
    display: 'block',
    inlineSize: 'var(--tw-checkbox-icon-size)',
    insetBlock: 0,
    insetInlineStart: 'var(--tw-checkbox-padding)',
    marginBlock: 'auto',
    opacity: { default: null, ':is([data-unchecked])': 0 },
    position: 'absolute',
  },
});
