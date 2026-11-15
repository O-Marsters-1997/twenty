import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { fontColor, fontSize } from '../../../../theme/tokens.stylex';
import { type SliderLabelProps } from '../types/SliderLabelProps';

export const SliderLabel = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SliderLabelProps>) => (
  <SliderPrimitive.Label
    {...props}
    {...mergeStylexProps(stylex.props(styles.label, xstyle), className)}
  />
);

const styles = stylex.create({
  label: {
    color: fontColor['--t-font-color-primary'],
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
  },
});
