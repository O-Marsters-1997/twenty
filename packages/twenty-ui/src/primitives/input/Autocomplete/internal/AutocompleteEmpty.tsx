import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { font, fontColor, fontSize, spacing } from '../../../../theme/tokens.stylex';
import { type AutocompleteEmptyProps } from '../types/AutocompleteEmptyProps';

export const AutocompleteEmpty = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AutocompleteEmptyProps>) => (
  <AutocompletePrimitive.Empty
    {...props}
    {...mergeStylexProps(stylex.props(styles.empty, xstyle), className)}
  />
);

const styles = stylex.create({
  empty: {
    color: fontColor['--t-font-color-secondary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    padding: { default: null, ':not(:empty)': spacing['--t-spacing-2'] },
  },
});
