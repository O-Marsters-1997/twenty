import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { spacing } from '../../../../theme/tokens.stylex';
import { type AutocompleteInputGroupProps } from '../types/AutocompleteInputGroupProps';

export const AutocompleteInputGroup = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AutocompleteInputGroupProps>) => (
  <AutocompletePrimitive.InputGroup
    {...props}
    {...mergeStylexProps(stylex.props(styles.inputGroup, xstyle), className)}
  />
);

const styles = stylex.create({
  inputGroup: {
    alignItems: 'center',
    display: 'flex',
    minInlineSize: 0,
    position: 'relative',
  },
});
