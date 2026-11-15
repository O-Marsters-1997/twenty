import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { color, spacing } from '../../../../theme/tokens.stylex';
import { type SliderRootProps } from '../types/SliderRootProps';

export const SliderRoot = <TValue extends number | readonly number[]>({
  className,
  xstyle,
  color: colorProp = 'accent',
  thumbAlignment = 'edge',
  ...props
}: WithXstyle<SliderRootProps<TValue>>) => (
  <SliderPrimitive.Root
    {...props}
    thumbAlignment={thumbAlignment}
    {...mergeStylexProps(
      stylex.props(styles.root, styles[colorProp], xstyle),
      className,
    )}
  />
);

const styles = stylex.create({
  root: {
    blockSize: { default: null, ':is([data-orientation="vertical"])': 160 },
    display: 'grid',
    gap: spacing['--t-spacing-2'],
    inlineSize: {
      default: '100%',
      ':is([data-orientation="vertical"])': 'fit-content',
    },
    opacity: { default: null, ':is([data-disabled])': 0.5 },
  },
  accent: { color: color['--t-color-blue9'] },
  success: { color: color['--t-color-green9'] },
});
