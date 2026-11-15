import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { blur } from '../../../../theme/tokens.stylex';
import { autocompleteArrowMarker } from '../Autocomplete.stylex';
import { type AutocompleteArrowProps } from '../types/AutocompleteArrowProps';

export const AutocompleteArrow = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AutocompleteArrowProps>) => (
  <AutocompletePrimitive.Arrow
    {...props}
    {...mergeStylexProps(
      stylex.props(autocompleteArrowMarker, styles.arrow, xstyle),
      className,
    )}
  />
);

const vertical = ':is([data-side="top"], [data-side="bottom"])';
const horizontal =
  ':is([data-side="left"], [data-side="right"], [data-side="inline-start"], [data-side="inline-end"])';
const towardsLeft =
  ':is([data-side="left"], [data-side="inline-start"]:dir(ltr), [data-side="inline-end"]:dir(rtl))';
const towardsRight =
  ':is([data-side="right"], [data-side="inline-end"]:dir(ltr), [data-side="inline-start"]:dir(rtl))';

const styles = stylex.create({
  arrow: {
    backdropFilter: blur['--t-blur-medium'],
    background: 'inherit',
    blockSize: {
      default: null,
      [vertical]: 6,
      [horizontal]: 12,
    },
    bottom: { default: null, ':is([data-side="top"])': -6 },
    clipPath: {
      default: null,
      ':is([data-side="top"])': 'polygon(0 0, 100% 0, 50% 100%)',
      ':is([data-side="bottom"])': 'polygon(50% 0, 100% 100%, 0 100%)',
      [towardsLeft]: 'polygon(0 0, 100% 50%, 0 100%)',
      [towardsRight]: 'polygon(100% 0, 100% 100%, 0 50%)',
    },
    inlineSize: {
      default: null,
      [vertical]: 12,
      [horizontal]: 6,
    },
    left: { default: null, [towardsRight]: -6 },
    position: 'absolute',
    right: { default: null, [towardsLeft]: -6 },
    top: { default: null, ':is([data-side="bottom"])': -6 },
  },
});
