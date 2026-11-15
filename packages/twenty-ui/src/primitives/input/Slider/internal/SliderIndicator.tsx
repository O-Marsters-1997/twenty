import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { borderRadius } from '../../../../theme/tokens.stylex';
import { type SliderIndicatorProps } from '../types/SliderIndicatorProps';

export const SliderIndicator = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SliderIndicatorProps>) => (
  <SliderPrimitive.Indicator
    {...props}
    {...mergeStylexProps(stylex.props(styles.indicator, xstyle), className)}
  />
);

const styles = stylex.create({
  indicator: {
    background: 'currentColor',
    borderEndEndRadius: {
      default: null,
      ':is([data-orientation="vertical"])': borderRadius['--t-border-radius-pill'],
    },
    borderEndStartRadius: borderRadius['--t-border-radius-pill'],
    borderStartStartRadius: {
      default: borderRadius['--t-border-radius-pill'],
      ':is([data-orientation="vertical"])': 0,
    },
  },
});
