import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { media } from '../../../../theme/constants.stylex';
import { background } from '../../../../theme/tokens.stylex';
import { type SwitchThumbProps } from '../types/SwitchThumbProps';

export const SwitchThumb = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SwitchThumbProps>) => (
  <SwitchPrimitive.Thumb
    {...props}
    {...mergeStylexProps(stylex.props(styles.thumb, xstyle), className)}
  />
);

const styles = stylex.create({
  thumb: {
    backgroundColor: background['--t-background-primary'],
    blockSize: 'var(--tw-switch-thumb-size)',
    borderRadius: '50%',
    display: 'block',
    inlineSize: 'var(--tw-switch-thumb-size)',
    insetBlockStart: 2,
    insetInlineStart: {
      default: 2,
      ':is([data-checked])': 'calc(100% - var(--tw-switch-thumb-size) - 2px)',
    },
    position: 'absolute',
    transition: {
      default: 'inset-inline-start 0.3s ease',
      [media.reducedMotion]: 'none',
    },
  },
});
