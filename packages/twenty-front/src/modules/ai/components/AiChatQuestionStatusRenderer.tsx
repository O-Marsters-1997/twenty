import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString, isString } from '@sniptt/guards';
import { type DynamicToolUIPart, type ToolUIPart } from 'ai';
import {
  type AskQuestionToolResult,
  type AskQuestionsToolResult,
} from 'twenty-shared/ai';
import { IconHelpCircle } from 'twenty-ui/icon';

import { AiChatAskStatusRow } from '@/ai/components/AiChatAskStatusRow';
import { TextWithChatReferences } from '@/ai/components/TextWithChatReferences';
import { getAskedQuestionEntries } from '@/ai/utils/getAskedQuestionEntries';
import { getChatReferenceSegments } from '@/ai/utils/getChatReferenceSegments';
import { aiChatAskStyles } from '@/ai/components/AiChatAskStyledComponents';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  answersCard: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  answerBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
    minWidth: '0',
  },
  answerQuestion: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    overflowWrap: 'anywhere',
  },
});

export const AiChatQuestionStatusRenderer = ({
  toolPart,
  isStreaming,
}: {
  toolPart: ToolUIPart | DynamicToolUIPart;
  isStreaming: boolean;
}) => {
  const { t } = useLingui();

  const result = (
    toolPart.output as {
      result?: AskQuestionToolResult | AskQuestionsToolResult;
    } | null
  )?.result;
  const status = result?.status ?? 'pending';
  const entries = getAskedQuestionEntries(result);

  if (status === 'pending') {
    if (entries.length !== 1) {
      return (
        <AiChatAskStatusRow
          Icon={IconHelpCircle}
          message={t`Asking questions...`}
          isShimmering={isStreaming}
        />
      );
    }

    const pendingQuestion = entries[0].question.question;

    // the shimmer clips text to a transparent fill, which would hide chip labels
    return (
      <AiChatAskStatusRow
        Icon={IconHelpCircle}
        message={
          isStreaming ? (
            getChatReferenceSegments(pendingQuestion)
              .map((segment) =>
                isString(segment) ? segment : segment.displayName,
              )
              .join('')
          ) : (
            <TextWithChatReferences text={pendingQuestion} />
          )
        }
        isShimmering={isStreaming}
      />
    );
  }

  if (status === 'skipped') {
    return (
      <AiChatAskStatusRow
        Icon={IconHelpCircle}
        message={
          entries.length > 1 ? t`Questions skipped` : t`Question skipped`
        }
        isShimmering={false}
      />
    );
  }

  return (
    <div {...stylex.props(styles.answersCard)}>
      <span {...stylex.props(aiChatAskStyles.statusMessage)}>{t`Answers`}</span>
      {entries.map(({ question, answer }, index) => {
        const selectedLabels = (answer?.selectedOptionIndices ?? [])
          .map((optionIndex) => question.options[optionIndex]?.label)
          .filter(isNonEmptyString);
        const freeTextAnswer = answer?.freeText ?? '';
        const value =
          freeTextAnswer.length > 0
            ? freeTextAnswer
            : selectedLabels.join(', ');

        if (value.length === 0) {
          return null;
        }

        return (
          <div key={index} {...stylex.props(styles.answerBlock)}>
            <span {...stylex.props(styles.answerQuestion)}>
              <TextWithChatReferences text={question.question} />
            </span>
            <span {...stylex.props(aiChatAskStyles.statusDetail)}>
              <TextWithChatReferences text={value} />
            </span>
          </div>
        );
      })}
    </div>
  );
};
