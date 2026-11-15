import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { font, fontColor, fontSize, fontWeight, spacing } from '../../../../theme/tokens.stylex';
import { type SelectGroupLabelProps } from '../types/SelectGroupLabelProps';

export const SelectGroupLabel = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SelectGroupLabelProps>) => (
  <SelectPrimitive.GroupLabel
    {...props}
    {...mergeStylexProps(stylex.props(styles.groupLabel, xstyle), className)}
  />
);

const styles = stylex.create({
  groupLabel: {
    color: fontColor['--t-font-color-secondary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    padding: spacing['--t-spacing-1'],
  },
});
