import { useRender } from '@base-ui/react/use-render';
import { isNonEmptyString, isString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { useId } from 'react';

import { Text } from '@ui/primitives/typography/Text/Text';
import { Heading } from '@ui/primitives/typography/Heading/Heading';
import { OverflowingTextWithTooltip } from '@ui/primitives/typography/OverflowingTextWithTooltip/OverflowingTextWithTooltip';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from '../../../../theme/tokens.stylex';
import { type SectionHeaderProps } from '../types/SectionHeaderProps';

export const SectionHeader = ({
  title,
  description,
  actions,
  level = 2,
  size = 'md',
  color = 'primary',
  descriptionLineClamp = 5,
  isDescriptionFocusable = false,
  render,
  ref,
  className,
  xstyle,
  ...props
}: WithXstyle<SectionHeaderProps>) => {
  const descriptionId = useId();
  const hasDescription = isString(description)
    ? isNonEmptyString(description)
    : isDefined(description) && description !== false;

  const shouldTruncateDescription =
    isString(description) && descriptionLineClamp !== false;
  const descriptionContent = isString(description) ? (
    <Text style={{ whiteSpace: 'pre-wrap' }}>{description}</Text>
  ) : (
    description
  );

  return useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.header, xstyle), className),
      children: (
        <>
          <div {...stylex.props(styles.titleRow)}>
            <Heading
              level={level}
              size={size}
              color={color}
              className={stylex.props(styles.title).className}
              aria-describedby={hasDescription ? descriptionId : undefined}
            >
              {title}
            </Heading>
            {isDefined(actions) && (
              <div {...stylex.props(styles.actions)}>{actions}</div>
            )}
          </div>
          {hasDescription && (
            <div id={descriptionId} {...stylex.props(styles.description)}>
              {shouldTruncateDescription ? (
                <OverflowingTextWithTooltip
                  text={description}
                  lineClamp={descriptionLineClamp}
                  isTooltipMultiline
                  isFocusable={isDescriptionFocusable}
                />
              ) : (
                descriptionContent
              )}
            </div>
          )}
        </>
      ),
    },
  });
};

const styles = stylex.create({
  header: {
    display: 'flex',
    flexDirection: 'column',
    marginBlockEnd: spacing['--t-spacing-4'],
    minInlineSize: 0,
  },
  titleRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
    minInlineSize: 0,
  },
  title: {
    lineHeight: 'inherit',
    minInlineSize: 0,
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
  },
  description: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
    marginBlockStart: spacing['--t-spacing-2'],
  },
});
