import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { spacing } from '../../../../theme/tokens.stylex';
import { type SliderControlProps } from '../types/SliderControlProps';

export const SliderControl = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SliderControlProps>) => (
  <SliderPrimitive.Control
    {...props}
    {...mergeStylexProps(stylex.props(styles.control, xstyle), className)}
  />
);

const styles = stylex.create({
  control: {
    alignItems: 'center',
    blockSize: { default: 24, ':is([data-orientation="vertical"])': '100%' },
    cursor: { default: 'pointer', ':is([data-disabled])': 'not-allowed' },
    display: 'flex',
    inlineSize: { default: null, ':is([data-orientation="vertical"])': 24 },
    justifyContent: { default: null, ':is([data-orientation="vertical"])': 'center' },
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
  },
});
