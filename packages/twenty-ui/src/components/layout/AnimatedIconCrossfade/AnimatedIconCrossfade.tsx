import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { media } from '../../../theme/constants.stylex';
import { animationDuration, iconSize } from '../../../theme/tokens.stylex';
import { type AnimatedIconCrossfadeProps } from './types/AnimatedIconCrossfadeProps';

export const AnimatedIconCrossfade = ({
  isActive,
  activeIcon,
  inactiveIcon,
  className,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<AnimatedIconCrossfadeProps>) => {
  return useRender({
    defaultTagName: 'span',
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.container, xstyle), className),
      children: (
        <>
          <span
            aria-hidden="true"
            {...stylex.props(
              styles.layer,
              isActive ? styles.hidden : styles.visible,
            )}
          >
            {inactiveIcon}
          </span>
          <span
            aria-hidden="true"
            {...stylex.props(
              styles.layer,
              isActive ? styles.visible : styles.hidden,
            )}
          >
            {activeIcon}
          </span>
        </>
      ),
    },
  });
};

const styles = stylex.create({
  container: {
    display: 'inline-block',
    height: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
    overflow: 'hidden',
    position: 'relative',
    width: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
  },
  layer: {
    alignItems: 'center',
    display: 'flex',
    inset: 0,
    justifyContent: 'center',
    position: 'absolute',
    transitionDuration: `${animationDuration['--t-animation-duration-fast']}s`,
    transitionProperty: {
      default: 'opacity, transform',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'ease-in-out',
  },
  visible: {
    opacity: 1,
    transform: 'scale(1)',
  },
  hidden: {
    opacity: 0,
    transform: 'scale(0.85)',
  },
});
