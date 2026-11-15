import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { fontColor } from '../../../../theme/tokens.stylex';
import { selectTriggerMarker } from '../Select.stylex';
import { type SelectValueProps } from '../types/SelectValueProps';

export const SelectValue = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SelectValueProps>) => (
  <SelectPrimitive.Value
    {...props}
    {...mergeStylexProps(stylex.props(styles.value, xstyle), className)}
  />
);

const styles = stylex.create({
  value: {
    color: {
      default: null,
      [stylex.when.ancestor(':is([data-placeholder])', selectTriggerMarker)]:
        fontColor['--t-font-color-light'],
    },
    flex: 1,
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});
