import { useRender } from '@base-ui/react/use-render';
import { isBoolean, isString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { OverflowingTextWithTooltip } from '@ui/primitives/typography/OverflowingTextWithTooltip/OverflowingTextWithTooltip';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import './Chip.css';
import { chipStyles } from './Chip.stylex';
import { type ChipProps } from './types/ChipProps';

const variantStyles = {
  ghost: null,
  soft: chipStyles.variantSoft,
  solid: chipStyles.variantSolid,
};

const clickableStyles = {
  ghost: chipStyles.clickableGhost,
  soft: chipStyles.clickableSoft,
  solid: chipStyles.clickableSolid,
};

export const Chip = ({
  children,
  size = 'sm',
  variant = 'ghost',
  color = 'primary',
  shape = 'square',
  weight = 'regular',
  onClick,
  clickable = isDefined(onClick),
  startElement,
  endElement,
  endElementDivider = false,
  maxWidth,
  truncate = true,
  tooltipContent,
  tooltipDelay,
  isTooltipMultiline,
  tooltipPlace,
  alwaysShowTooltip = false,
  className,
  style,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<ChipProps>) => {
  const hasContent =
    isDefined(children) && !isBoolean(children) && children !== '';
  const textProps = isString(children)
    ? { text: children, tooltipContent }
    : { text: children ?? false, tooltipContent: tooltipContent ?? '' };
  const stylexProps = stylex.props(
    chipStyles.root,
    truncate && chipStyles.truncate,
    size === 'md' && chipStyles.sizeMd,
    shape === 'round' && chipStyles.shapeRound,
    color === 'secondary' && chipStyles.colorSecondary,
    weight === 'medium' && chipStyles.weightMedium,
    variantStyles[variant],
    clickable && clickableStyles[variant],
    xstyle,
  );

  return useRender({
    render,
    ref,
    state: { size, variant, color, shape, weight, clickable, truncate },
    props: {
      ...props,
      onClick,
      ...mergeStylexProps(mergeStylexProps(stylexProps, 'tw-chip'), className),
      style: {
        ...stylexProps.style,
        ...(isDefined(maxWidth)
          ? {
              '--tw-chip-max-width': `calc(${maxWidth}px - 2 * var(--tw-chip-padding))`,
            }
          : {}),
        ...style,
      } as CSSProperties,
      children: (
        <>
          {startElement}
          {hasContent && (
            <OverflowingTextWithTooltip
              {...textProps}
              render={<span />}
              xstyle={size === 'md' ? chipStyles.labelMd : undefined}
              truncate={truncate}
              tooltipDelay={tooltipDelay}
              isTooltipMultiline={isTooltipMultiline}
              tooltipPlace={tooltipPlace}
              alwaysShowTooltip={alwaysShowTooltip}
            />
          )}
          {isDefined(endElement) && endElement !== false && (
            <>
              {endElementDivider && (
                <span {...stylex.props(chipStyles.endElementDivider)} />
              )}
              {endElement}
            </>
          )}
        </>
      ),
    },
  });
};
