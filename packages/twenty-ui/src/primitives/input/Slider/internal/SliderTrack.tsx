import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { background, borderRadius } from '../../../../theme/tokens.stylex';
import { type SliderTrackProps } from '../types/SliderTrackProps';

export const SliderTrack = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SliderTrackProps>) => (
  <SliderPrimitive.Track
    {...props}
    {...mergeStylexProps(stylex.props(styles.track, xstyle), className)}
  />
);

const styles = stylex.create({
  track: {
    background: background['--t-background-tertiary'],
    blockSize: { default: 16, ':is([data-orientation="vertical"])': '100%' },
    borderRadius: borderRadius['--t-border-radius-pill'],
    inlineSize: { default: '100%', ':is([data-orientation="vertical"])': 16 },
    position: 'relative',
  },
});
