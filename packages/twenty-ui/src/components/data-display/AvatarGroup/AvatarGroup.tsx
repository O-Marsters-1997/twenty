import { useRender } from '@base-ui/react/use-render';
import { isNonEmptyArray } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { Children, isValidElement } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import {
  background,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from '../../../theme/tokens.stylex';
import { type AvatarGroupProps } from './types/AvatarGroupProps';

const DEFAULT_MAX_VISIBLE_AVATARS = 4;

export const AvatarGroup = ({
  avatars,
  className,
  xstyle,
  maxVisible = DEFAULT_MAX_VISIBLE_AVATARS,
  total,
  renderOverflow,
  overflowShape = 'square',
  overlap = 'right',
  overlapOffset = '3px',
  render,
  ref,
  ...props
}: WithXstyle<AvatarGroupProps>) => {
  const suppliedAvatars = Children.toArray(avatars);
  const visibleLimit = Number.isNaN(maxVisible)
    ? 0
    : Math.max(0, Math.floor(maxVisible));
  const visibleAvatars = suppliedAvatars.slice(0, visibleLimit);
  const suppliedTotal = total ?? suppliedAvatars.length;
  const avatarTotal = Number.isFinite(suppliedTotal)
    ? Math.max(suppliedAvatars.length, Math.floor(suppliedTotal))
    : suppliedAvatars.length;
  const hiddenCount = avatarTotal - visibleAvatars.length;
  const hasCustomOverflow = isDefined(renderOverflow);
  const overflowContent =
    hiddenCount > 0 &&
    (hasCustomOverflow ? (
      renderOverflow(hiddenCount)
    ) : (
      <span
        {...stylex.props(
          styles.overflowCount,
          overflowShape === 'circle' && styles.overflowCountCircle,
        )}
        data-shape={overflowShape}
      >
        +{hiddenCount}
      </span>
    ));
  const hasOverflow = isNonEmptyArray(Children.toArray(overflowContent));
  const itemStyles = [
    overlap === 'right'
      ? styles.overlapRight(overlapOffset)
      : styles.overlapLeft(overlapOffset),
    overlap === 'right' ? styles.overlapRightEdge : styles.overlapLeftEdge,
  ];

  const element = useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.container, xstyle), className),
      children: (
        <>
          {Children.map(visibleAvatars, (avatar) => (
            <span
              {...stylex.props(styles.itemContainer, itemStyles)}
              key={isValidElement(avatar) ? avatar.key : undefined}
              data-overlap={overlap}
            >
              {avatar}
            </span>
          ))}
          {hasOverflow && (
            <span
              {...stylex.props(
                styles.itemContainer,
                itemStyles,
                !hasCustomOverflow && styles.overflowCountContainer,
              )}
              data-overlap={overlap}
            >
              {overflowContent}
            </span>
          )}
        </>
      ),
    },
  });

  return isNonEmptyArray(visibleAvatars) || hasOverflow ? element : null;
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
  },
  itemContainer: {
    display: 'flex',
  },
  overlapRight: (offset: string) => ({
    marginRight: `calc(-1 * ${offset})`,
  }),
  overlapLeft: (offset: string) => ({
    marginLeft: `calc(-1 * ${offset})`,
  }),
  overlapRightEdge: {
    marginRight: {
      default: null,
      ':dir(ltr):last-child': 0,
      ':dir(rtl):first-child': 0,
    },
  },
  overlapLeftEdge: {
    marginLeft: {
      default: null,
      ':dir(ltr):first-child': 0,
      ':dir(rtl):last-child': 0,
    },
  },
  overflowCountContainer: {
    alignSelf: 'stretch',
  },
  overflowCount: {
    alignItems: 'center',
    backgroundColor: background['--t-background-tertiary'],
    borderColor: background['--t-background-primary'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'center',
    lineHeight: textLineHeight['--t-text-line-height-md'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-1'],
  },
  overflowCountCircle: {
    borderRadius: borderRadius['--t-border-radius-md-round'],
  },
});
