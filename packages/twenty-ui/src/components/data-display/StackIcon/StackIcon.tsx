import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { spacing } from '../../../theme/tokens.stylex';
import { type StackIconProps } from './types/StackIconProps';

export const StackIcon = ({
  icon,
  stackedIcon,
  className,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<StackIconProps>) => {
  return useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.root, xstyle), className),
      children: (
        <>
          <span aria-hidden="true" {...stylex.props(styles.iconSlot)}>
            {icon}
          </span>
          <span
            aria-hidden="true"
            {...stylex.props(styles.iconSlot, styles.stackedIcon)}
          >
            {stackedIcon}
          </span>
        </>
      ),
    },
  });
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    height: spacing['--t-spacing-4'],
    justifyContent: 'center',
    position: 'relative',
    width: spacing['--t-spacing-4'],
  },
  iconSlot: {
    display: 'flex',
  },
  stackedIcon: {
    left: spacing['--t-spacing-2'],
    position: 'absolute',
    top: 7,
  },
});
