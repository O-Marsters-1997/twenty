import { styled } from '@linaria/react';
import { plural, t } from '@lingui/core/macro';
import { useState } from 'react';
import { IconChevronRight, IconCpu } from 'twenty-ui/icon';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';

import { AiChatThinkingRow } from '@/ai/components/AiChatThinkingRow';
import { LazyMarkdownRenderer } from '@/ai/components/LazyMarkdownRenderer';
import { StyledParagraph } from '@/ai/components/LazyMarkdownRendererStyledComponents';
import { ThinkingToolStepRow } from '@/ai/components/ThinkingToolStepRow';
import { getActiveReasoningContent } from '@/ai/utils/getActiveReasoningContent';
import { getLastReasoningContent } from '@/ai/utils/getLastReasoningContent';
import { isThinkingStepPartActive } from '@/ai/utils/isThinkingStepPartActive';
import { type ThinkingStepPart } from '@/ai/types/ThinkingStepPart';
import { formatRoundedDuration } from '~/utils/format/formatRoundedDuration';
import * as stylex from '@stylexjs/stylex';
import { animationDuration, borderRadius, color, font, fontColor, fontSize, fontWeight, iconSize, spacing, textLineHeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--t-font-family'],
    gap: spacing['--t-spacing-1'],
  },
  stepsContentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
  },
  summaryText: {
    color: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    transition: `color calc(${animationDuration['--t-animation-duration-fast']} * 1s)
    ease-in-out`,
  },
  summaryButton: {
    alignItems: 'center',
    background: 'none',
    borderStyle: 'none',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: { default: fontColor['--t-font-color-tertiary'], ':hover': fontColor['--t-font-color-primary'] },
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    gap: spacing['--t-spacing-2'],
    minHeight: '24px',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    width: 'fit-content',
    outline: { default: null, ':focus-visible': `2px solid ${color['--t-color-blue']}` },
    outlineOffset: { default: null, ':focus-visible': '2px' },
  },
  rowsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
  },
  row: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    minHeight: '24px',
  },
  rowLabel: {
    color: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    transition: `color calc(${animationDuration['--t-animation-duration-fast']} * 1s)
    ease-in-out`,
  },
  reasoningContainer: {
    paddingLeft: `calc(
    ${iconSize['--t-icon-size-sm']} * 1px + ${spacing['--t-spacing-2']}
  )`,
  },
  iconContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    justifyContent: 'center',
    minWidth: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
  },
  rowLabelContainer: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
  },
});

const StyledSummaryChevronContainer = styled.div<{ isExpanded: boolean }>`
  align-items: center;
  color: ${themeCssVariables.font.color.light};
  display: flex;
  justify-content: center;
  transform: rotate(${({ isExpanded }) => (isExpanded ? '90deg' : '0deg')});
  transition: transform calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease-in-out;
`;

const StyledReasoningText = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.regular};
  line-height: ${themeCssVariables.text.lineHeight.lg};

  // reasoning uses single newlines as line breaks, which markdown would collapse
  ${StyledParagraph} {
    white-space: pre-line;
  }
`;

const ThinkingStepRow = ({
  isActive,
  part,
}: {
  isActive: boolean;
  part: ThinkingStepPart;
}) => {
  if (part.type !== 'reasoning') {
    return <ThinkingToolStepRow part={part} isActive={isActive} />;
  }

  if (isActive) {
    return <AiChatThinkingRow />;
  }

  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.iconContainer)}>
        <IconCpu size={14} />
      </div>
      <div {...stylex.props(styles.rowLabelContainer)}>
        <span {...stylex.props(styles.rowLabel)}>{t`Thought`}</span>
      </div>
    </div>
  );
};

export const ThinkingStepsDisplay = ({
  parts,
  isLastMessageStreaming,
  hasAssistantTextResponseStarted,
  isTrailingWhileStreaming = false,
  workDurationMs,
}: {
  parts: ThinkingStepPart[];
  isLastMessageStreaming: boolean;
  hasAssistantTextResponseStarted: boolean;
  isTrailingWhileStreaming?: boolean;
  workDurationMs?: number | null;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const stepCount = parts.length;
  const hasActiveStep = parts.some((part) =>
    isThinkingStepPartActive(part, isLastMessageStreaming),
  );

  const activeReasoningContent = getActiveReasoningContent(parts);
  const finalReasoningContent = getLastReasoningContent(parts);
  const reasoningContent = hasActiveStep
    ? activeReasoningContent
    : finalReasoningContent;
  const shouldDisplayReasoningContent = reasoningContent?.trim().length;
  const shouldKeepExpandedBeforeAnswer = !hasAssistantTextResponseStarted;
  const shouldShowSummaryButton =
    !hasActiveStep && !shouldKeepExpandedBeforeAnswer;

  const shouldRenderRows =
    hasActiveStep || isExpanded || shouldKeepExpandedBeforeAnswer;

  return (
    <div {...stylex.props(styles.container)}>
      {shouldShowSummaryButton && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((previousValue) => !previousValue)} {...stylex.props(styles.summaryButton)}
        >
          <StyledSummaryChevronContainer isExpanded={isExpanded}>
            <IconChevronRight size={14} />
          </StyledSummaryChevronContainer>
          <span {...stylex.props(styles.summaryText)}>
            {isDefined(workDurationMs)
              ? t`Worked for ${formatRoundedDuration(workDurationMs)}`
              : plural(stepCount, {
                  one: '# step',
                  other: '# steps',
                })}
          </span>
        </button>
      )}

      {shouldRenderRows && (
        <div {...stylex.props(styles.stepsContentContainer)}>
          <div {...stylex.props(styles.rowsContainer)}>
            {parts.map((part, index) => (
              <ThinkingStepRow
                key={index}
                part={part}
                isActive={isThinkingStepPartActive(
                  part,
                  isLastMessageStreaming,
                )}
              />
            ))}
            {isTrailingWhileStreaming && !hasActiveStep && (
              <AiChatThinkingRow />
            )}
          </div>
          {!!shouldDisplayReasoningContent && (
            <div {...stylex.props(styles.reasoningContainer)}>
              <StyledReasoningText>
                <LazyMarkdownRenderer text={reasoningContent} />
              </StyledReasoningText>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
