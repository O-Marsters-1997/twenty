import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { createPortal } from 'react-dom';

import { useProvidedTextDirection } from '@ui/primitives/layout/DirectionProvider/internal/useProvidedTextDirection';
import { useThemeContainer } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { media } from '../../../theme/constants.stylex';
import { general, spacing } from '../../../theme/tokens.stylex';
import { ToasterItems } from './internal/ToasterItems';
import { ToasterLifecycleEffect } from './internal/ToasterLifecycleEffect';
import { type ToasterProps } from './types/ToasterProps';

export const Toaster = ({
  container,
  getToastProps,
  className,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<ToasterProps>) => {
  const themeContainer = useThemeContainer();
  const direction = useProvidedTextDirection();
  const target =
    container === undefined
      ? (themeContainer ??
        (typeof document === 'undefined' ? null : document.body))
      : container;

  const element = useRender({
    render,
    ref,
    props: {
      role: 'region',
      dir: direction,
      'aria-label': 'Notifications',
      ...props,
      ...mergeStylexProps(stylex.props(styles.root, xstyle), className),
      children: (
        <>
          <ToasterLifecycleEffect />
          <ToasterItems getToastProps={getToastProps} />
        </>
      ),
    },
  });

  return isDefined(target) ? createPortal(element, target) : null;
};

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    insetBlockEnd: {
      default: spacing['--t-spacing-3'],
      [media.mobile]: 'auto',
    },
    insetBlockStart: {
      default: null,
      [media.mobile]: 0,
    },
    insetInlineEnd: {
      default: spacing['--t-spacing-3'],
      [media.mobile]: 0,
    },
    insetInlineStart: {
      default: null,
      [media.mobile]: 0,
    },
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: general['--t-last-layer-z-index'],
  },
});
