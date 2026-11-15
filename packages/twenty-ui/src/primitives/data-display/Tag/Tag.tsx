import { useRender } from '@base-ui/react/use-render';
import { isBoolean, isString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { OverflowingTextWithTooltip } from '@ui/primitives/typography/OverflowingTextWithTooltip/OverflowingTextWithTooltip';
import { themeCssVariables } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import './Tag.css';
import { tagStyles } from './Tag.stylex';
import { type TagProps } from './types/TagProps';

const variantStyles = {
  soft: null,
  outline: tagStyles.variantOutline,
  ghost: tagStyles.variantGhost,
  solid: tagStyles.variantSolid,
};

export const Tag = ({
  children,
  color,
  weight = 'regular',
  variant = 'soft',
  startIcon,
  truncate = true,
  borderStyle = 'solid',
  className,
  style,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<TagProps>) => {
  const stylexProps = stylex.props(
    tagStyles.root,
    weight === 'medium' && tagStyles.weightMedium,
    variantStyles[variant],
    xstyle,
  );

  return useRender({
    defaultTagName: 'span',
    render,
    ref,
    state: {
      variant,
      weight,
      truncate,
    },
    props: {
      ...props,
      ...mergeStylexProps(stylexProps, className),
      style: {
        ...stylexProps.style,
        '--tw-tag-background':
          color === 'transparent'
            ? 'transparent'
            : (themeCssVariables.tag.background[color] ??
              themeCssVariables.tag.background.gray),
        '--tw-tag-text':
          color === 'transparent'
            ? themeCssVariables.font.color.secondary
            : (themeCssVariables.tag.text[color] ??
              themeCssVariables.font.color.secondary),
        '--tw-tag-border-style': borderStyle,
        ...style,
      } as CSSProperties,
      children: (
        <>
          {isDefined(startIcon) &&
            !isBoolean(startIcon) &&
            startIcon !== '' && (
              <span
                {...mergeStylexProps(
                  stylex.props(tagStyles.iconContainer),
                  'tw-tag-icon',
                )}
                aria-hidden
              >
                {startIcon}
              </span>
            )}
          <span
            {...stylex.props(
              tagStyles.content,
              truncate && tagStyles.contentTruncate,
            )}
          >
            {isString(children) && truncate ? (
              <OverflowingTextWithTooltip
                text={children}
                render={<span />}
                xstyle={tagStyles.overflowingText}
              />
            ) : (
              children
            )}
          </span>
        </>
      ),
    },
  });
};
