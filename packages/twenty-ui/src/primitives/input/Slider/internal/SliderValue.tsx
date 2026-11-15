import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { fontColor, fontSize } from '../../../../theme/tokens.stylex';
import { type SliderValueProps } from '../types/SliderValueProps';

export const SliderValue = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SliderValueProps>) => (
  <SliderPrimitive.Value
    {...props}
    {...mergeStylexProps(stylex.props(styles.value, xstyle), className)}
  />
);

const styles = stylex.create({
  value: {
    color: fontColor['--t-font-color-primary'],
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
    fontVariantNumeric: 'tabular-nums',
  },
});
