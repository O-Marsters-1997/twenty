import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { spacing } from '../../../../theme/tokens.stylex';
import { type AutocompleteListProps } from '../types/AutocompleteListProps';

export const AutocompleteList = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AutocompleteListProps>) => (
  <AutocompletePrimitive.List
    {...props}
    {...mergeStylexProps(stylex.props(styles.list, xstyle), className)}
  />
);

const styles = stylex.create({
  list: {
    maxBlockSize: 176,
    outline: 'none',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
  },
});
