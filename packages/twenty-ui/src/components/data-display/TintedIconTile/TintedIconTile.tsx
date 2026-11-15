import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { getIconTileColorShades } from '@ui/components/data-display/TintedIconTile/utils/getIconTileColorShades';
import { DEFAULT_THEME_COLOR_FALLBACK } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { borderRadius, spacing } from '../../../theme/tokens.stylex';
import { type TintedIconTileProps } from './types/TintedIconTileProps';

export const TintedIconTile = ({
  icon,
  color = DEFAULT_THEME_COLOR_FALLBACK,
  className,
  style,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<TintedIconTileProps>) => {
  const colorShades = getIconTileColorShades(color);

  return useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.root, xstyle), className),
      style: {
        backgroundColor: colorShades.backgroundColor,
        color: colorShades.iconColor,
        ...style,
      },
      children: (
        <span aria-hidden="true" {...stylex.props(styles.icon)}>
          {icon}
        </span>
      ),
    },
  });
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    height: spacing['--t-spacing-4'],
    justifyContent: 'center',
    width: spacing['--t-spacing-4'],
  },
  icon: {
    display: 'flex',
  },
});
