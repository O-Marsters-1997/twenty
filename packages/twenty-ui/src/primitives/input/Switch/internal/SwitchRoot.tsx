import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import {
  backgroundTransparent,
  borderRadius,
  color,
} from '../../../../theme/tokens.stylex';
import { type SwitchRootProps } from '../types/SwitchRootProps';

export const SwitchRoot = ({
  size = 'md',
  className,
  xstyle,
  ...props
}: WithXstyle<SwitchRootProps>) => (
  <SwitchPrimitive.Root
    {...props}
    {...mergeStylexProps(
      stylex.props(
        focusStyles.ring,
        styles.root,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        xstyle,
      ),
      className,
    )}
  />
);

const styles = stylex.create({
  root: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-medium'],
      ':is([data-checked])': 'currentColor',
    },
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderWidth: 0,
    boxSizing: 'border-box',
    color: color['--t-color-blue'],
    cursor: {
      default: 'pointer',
      ':is([data-disabled], [data-readonly])': 'default',
    },
    display: 'inline-flex',
    flexShrink: 0,
    opacity: { default: null, ':is([data-disabled])': 0.5 },
    padding: 0,
    position: 'relative',
    transitionDuration: '0.3s',
    transitionProperty: 'background-color',
    transitionTimingFunction: 'ease',
  },
  sizeSm: { '--tw-switch-thumb-size': '12px', blockSize: 16, inlineSize: 24 },
  sizeMd: { '--tw-switch-thumb-size': '16px', blockSize: 20, inlineSize: 32 },
});
