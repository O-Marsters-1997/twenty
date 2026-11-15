import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { background, borderRadius, color } from '../../../../theme/tokens.stylex';
import { type SliderThumbProps } from '../types/SliderThumbProps';

export const SliderThumb = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SliderThumbProps>) => (
  <SliderPrimitive.Thumb
    {...props}
    {...mergeStylexProps(stylex.props(styles.thumb, xstyle), className)}
  />
);

const styles = stylex.create({
  thumb: {
    background: background['--t-background-primary'],
    blockSize: 16,
    borderColor: 'currentColor',
    borderRadius: borderRadius['--t-border-radius-rounded'],
    borderStyle: 'solid',
    borderWidth: 2,
    boxSizing: 'border-box',
    inlineSize: 16,
    outlineColor: { default: null, ':has(:focus-visible)': color['--t-color-blue'] },
    outlineOffset: { default: null, ':has(:focus-visible)': '1px' },
    outlineStyle: { default: null, ':has(:focus-visible)': 'solid' },
    outlineWidth: { default: null, ':has(:focus-visible)': '2px' },
  },
});
