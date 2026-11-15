import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { borderColor } from '../../../theme/tokens.stylex';
import { type SeparatorProps } from './types/SeparatorProps';

export const Separator = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SeparatorProps>) => (
  <SeparatorPrimitive
    {...props}
    {...mergeStylexProps(stylex.props(styles.root, xstyle), className)}
  />
);

const styles = stylex.create({
  root: {
    alignSelf: {
      default: null,
      ':is([data-orientation="vertical"])': 'stretch',
    },
    backgroundColor: borderColor['--t-border-color-medium'],
    flexShrink: 0,
    height: {
      default: null,
      ':is([data-orientation="horizontal"])': '1px',
    },
    marginBlock: 0,
    marginInline: 0,
    width: {
      default: null,
      ':is([data-orientation="horizontal"])': '100%',
      ':is([data-orientation="vertical"])': '1px',
    },
  },
});
