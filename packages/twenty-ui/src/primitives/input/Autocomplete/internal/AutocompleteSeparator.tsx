import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { borderColor, spacing } from '../../../../theme/tokens.stylex';
import { type AutocompleteSeparatorProps } from '../types/AutocompleteSeparatorProps';

export const AutocompleteSeparator = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AutocompleteSeparatorProps>) => (
  <AutocompletePrimitive.Separator
    {...props}
    {...mergeStylexProps(stylex.props(styles.separator, xstyle), className)}
  />
);

const styles = stylex.create({
  separator: {
    alignSelf: {
      default: null,
      ':is([data-orientation="vertical"])': 'stretch',
    },
    background: borderColor['--t-border-color-light'],
    blockSize: { default: 1, ':is([data-orientation="vertical"])': 'auto' },
    flex: 'none',
    inlineSize: { default: null, ':is([data-orientation="vertical"])': 1 },
    marginBlock: {
      default: null,
      ':is([data-orientation="vertical"])': `calc(-1 * ${spacing['--t-spacing-1']})`,
    },
    marginInline: {
      default: `calc(-1 * ${spacing['--t-spacing-1']})`,
      ':is([data-orientation="vertical"])': 0,
    },
  },
});
