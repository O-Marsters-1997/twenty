import { useLingui } from '@lingui/react/macro';
import { type KeyboardEvent, useState } from 'react';
import {
  type AskQuestionAnswer,
  type AskQuestionItem,
  type AskQuestionToolResult,
  type AskQuestionsToolResult,
} from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';
import { IconButton, LightIconButton } from 'twenty-ui/components/input';
import {
  IconArrowUp,
  IconChevronLeft,
  IconChevronRightPipe,
  type IconComponent,
  IconInfoCircle,
  IconSquareNumber1,
  IconSquareNumber2,
  IconSquareNumber3,
  IconSquareNumber4,
  IconSquareNumber5,
  IconSquareNumber6,
  IconSquareNumber7,
  IconSquareNumber8,
  IconSquareNumber9,
} from 'twenty-ui/icon';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';

import { aiChatAskStyles } from '@/ai/components/AiChatAskStyledComponents';
import { TextWithChatReferences } from '@/ai/components/TextWithChatReferences';
import { AiChatComposerActionsRow } from '@/ai/components/internal/AiChatComposerActionsRow';
import { AiChatQuestionOtherOption } from '@/ai/components/internal/AiChatQuestionOtherOption';
import { useAnswerAgentChatToolCall } from '@/ai/hooks/useAnswerAgentChatToolCall';
import { type AgentChatPendingQuestion } from '@/ai/types/AgentChatPendingQuestion';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const NUMBER_ICONS: IconComponent[] = [
  IconSquareNumber1,
  IconSquareNumber2,
  IconSquareNumber3,
  IconSquareNumber4,
  IconSquareNumber5,
  IconSquareNumber6,
  IconSquareNumber7,
  IconSquareNumber8,
  IconSquareNumber9,
];

const getOptionNumberIcon = (optionIndex: number) =>
  NUMBER_ICONS[Math.min(optionIndex, NUMBER_ICONS.length - 1)];

const styles = stylex.create({
  optionRow: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-1'],
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    height: '32px',
  },
  optionRowHighlighted: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  questionSection: {
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  questionHeaderRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    minHeight: '24px',
    paddingLeft: spacing['--t-spacing-1'],
  },
  questionText: {
    flexGrow: '1',
    flexShrink: '0',
    flexBasis: '0',
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    lineHeight: '1.4',
    overflowWrap: 'anywhere',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
    minWidth: '0',
  },
  pager: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
  },
  pagerLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  optionsList: {
    gap: spacing['--t-spacing-0_5'],
    display: 'flex',
    flexDirection: 'column',
  },
  optionLeft: {
    flexGrow: '1',
    flexShrink: '0',
    flexBasis: '0',
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  optionLabel: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-secondary'],
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: '1.4',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  recommended: {
    color: fontColor['--t-font-color-light'],
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: '1.4',
  },
  divider: {
    background: borderColor['--t-border-color-light'],
    height: '1px',
    width: '100%',
  },
  composerSection: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

const areAllQuestionsAnswered = (
  questions: AskQuestionItem[],
  selectedByQuestion: Record<number, number[]>,
  freeTextByQuestion: Record<number, string>,
  otherSelectedByQuestion: Record<number, boolean>,
) =>
  questions.every(
    (_, index) =>
      (selectedByQuestion[index]?.length ?? 0) > 0 ||
      (otherSelectedByQuestion[index] &&
        (freeTextByQuestion[index] ?? '').trim().length > 0),
  );

type AiChatQuestionCardProps = {
  pendingQuestion: AgentChatPendingQuestion;
};

export const AiChatQuestionCard = ({
  pendingQuestion,
}: AiChatQuestionCardProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const { toolCallId } = pendingQuestion;
  const questions =
    pendingQuestion.kind === 'question'
      ? [pendingQuestion.question]
      : pendingQuestion.questions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedByQuestion, setSelectedByQuestion] = useState<
    Record<number, number[]>
  >({});
  const [freeTextByQuestion, setFreeTextByQuestion] = useState<
    Record<number, string>
  >({});
  const [otherSelectedByQuestion, setOtherSelectedByQuestion] = useState<
    Record<number, boolean>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { answerAgentChatToolCall } = useAnswerAgentChatToolCall();

  const currentQuestion = questions[currentIndex];
  const hasMultipleQuestions = questions.length > 1;
  const isLastQuestion = currentIndex === questions.length - 1;

  const buildAnswers = (
    selected: Record<number, number[]>,
    otherSelected: Record<number, boolean>,
  ): AskQuestionAnswer[] =>
    questions.map((_, index) => {
      const trimmedFreeText = (freeTextByQuestion[index] ?? '').trim();
      const shouldIncludeFreeText =
        (otherSelected[index] ?? false) && trimmedFreeText.length > 0;

      return {
        questionIndex: index,
        selectedOptionIndices: selected[index] ?? [],
        freeText: shouldIncludeFreeText ? trimmedFreeText : undefined,
      };
    });

  const submit = async (answers: AskQuestionAnswer[]) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const [{ selectedOptionIndices, freeText }] = answers;
    const isAnswered = await answerAgentChatToolCall(
      pendingQuestion.kind === 'question'
        ? {
            toolCallId,
            response: { selectedOptionIndices, freeText },
            optimisticToolOutput: {
              success: true,
              result: {
                question: pendingQuestion.question,
                status: 'answered',
                answer: { selectedOptionIndices, freeText },
              } satisfies AskQuestionToolResult,
            },
          }
        : {
            toolCallId,
            response: { answers },
            optimisticToolOutput: {
              success: true,
              result: {
                questions,
                status: 'answered',
                answers,
              } satisfies AskQuestionsToolResult,
            },
          },
    );

    // The card goes once its call is closed, so it stays disabled until then.
    if (!isAnswered) {
      setIsSubmitting(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (currentQuestion.allowMultiSelect === true) {
      setSelectedByQuestion((previous) => {
        const current = previous[currentIndex] ?? [];
        const next = current.includes(optionIndex)
          ? current.filter((value) => value !== optionIndex)
          : [...current, optionIndex];

        return { ...previous, [currentIndex]: next };
      });

      return;
    }

    const nextSelected = {
      ...selectedByQuestion,
      [currentIndex]: [optionIndex],
    };
    const nextOtherSelected = {
      ...otherSelectedByQuestion,
      [currentIndex]: false,
    };

    setSelectedByQuestion(nextSelected);
    setOtherSelectedByQuestion(nextOtherSelected);

    if (!isLastQuestion) {
      setCurrentIndex(currentIndex + 1);

      return;
    }

    if (
      areAllQuestionsAnswered(
        questions,
        nextSelected,
        freeTextByQuestion,
        nextOtherSelected,
      )
    ) {
      void submit(buildAnswers(nextSelected, nextOtherSelected));
    }
  };

  const selectOther = () => {
    setOtherSelectedByQuestion((previous) => ({
      ...previous,
      [currentIndex]: true,
    }));

    if (currentQuestion.allowMultiSelect !== true) {
      setSelectedByQuestion((previous) => ({
        ...previous,
        [currentIndex]: [],
      }));
    }
  };

  const handleToggleOther = () => {
    if (
      currentQuestion.allowMultiSelect === true &&
      otherSelectedByQuestion[currentIndex]
    ) {
      setOtherSelectedByQuestion((previous) => ({
        ...previous,
        [currentIndex]: false,
      }));

      return;
    }

    selectOther();
  };

  const handleOtherTextChange = (value: string) => {
    setFreeTextByQuestion((previous) => ({
      ...previous,
      [currentIndex]: value,
    }));

    if (value.trim().length > 0) {
      selectOther();
    }
  };

  const allQuestionsAnswered = areAllQuestionsAnswered(
    questions,
    selectedByQuestion,
    freeTextByQuestion,
    otherSelectedByQuestion,
  );

  const handleSend = () => {
    if (!allQuestionsAnswered) {
      return;
    }

    void submit(buildAnswers(selectedByQuestion, otherSelectedByQuestion));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (!isLastQuestion) {
        setCurrentIndex(currentIndex + 1);

        return;
      }

      handleSend();
    }
  };

  return (
    <div {...stylex.props(aiChatAskStyles.card)}>
      <div {...stylex.props(styles.questionSection)}>
        <div {...stylex.props(styles.questionHeaderRow)}>
          <p {...stylex.props(styles.questionText)}>
            <TextWithChatReferences text={currentQuestion.question} />
          </p>
          {hasMultipleQuestions && (
            <div {...stylex.props(styles.pager)}>
              <LightIconButton
                size="sm"
                disabled={currentIndex === 0}
                onClick={() =>
                  setCurrentIndex((index) => Math.max(0, index - 1))
                }
                aria-label={t`Previous`}
              >
                <IconChevronLeft />
              </LightIconButton>
              <span {...stylex.props(styles.pagerLabel)}>
                {currentIndex + 1}/{questions.length}
              </span>
              <LightIconButton
                size="sm"
                disabled={isLastQuestion}
                onClick={() =>
                  setCurrentIndex((index) =>
                    Math.min(questions.length - 1, index + 1),
                  )
                }
                aria-label={t`Next question`}
              >
                <IconChevronRightPipe />
              </LightIconButton>
            </div>
          )}
        </div>

        <div {...stylex.props(styles.optionsList)}>
          {currentQuestion.options.map((option, optionIndex) => {
            const NumberIcon = getOptionNumberIcon(optionIndex);
            const isSelected = (
              selectedByQuestion[currentIndex] ?? []
            ).includes(optionIndex);
            const hasSelection =
              (selectedByQuestion[currentIndex] ?? []).length > 0 ||
              (otherSelectedByQuestion[currentIndex] ?? false);
            const isHighlighted =
              isSelected || (!hasSelection && option.isRecommended === true);

            return (
              <div
                {...stylex.props(
                  styles.optionRow,
                  isHighlighted && styles.optionRowHighlighted,
                )}
                key={optionIndex}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectOption(optionIndex)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectOption(optionIndex);
                  }
                }}
              >
                <div {...stylex.props(styles.optionLeft)}>
                  <NumberIcon
                    size={theme.icon.size.sm}
                    color={themeCssVariables.font.color.tertiary}
                  />
                  <span {...stylex.props(styles.optionLabel)}>
                    <TextWithChatReferences text={option.label} />
                  </span>
                  {option.isRecommended === true && (
                    <span {...stylex.props(styles.recommended)}>
                      · {t`Recommended`}
                    </span>
                  )}
                </div>
                {isDefined(option.description) && (
                  <Tooltip
                    content={option.description}
                    delay={TooltipDelay.shortDelay}
                    side="left"
                  >
                    <span onClick={(event) => event.stopPropagation()}>
                      <LightIconButton
                        size="sm"
                        emphasis="subtle"
                        aria-label={t`Information`}
                      >
                        <IconInfoCircle />
                      </LightIconButton>
                    </span>
                  </Tooltip>
                )}
              </div>
            );
          })}
          <AiChatQuestionOtherOption
            NumberIcon={getOptionNumberIcon(currentQuestion.options.length)}
            isHighlighted={otherSelectedByQuestion[currentIndex] ?? false}
            value={freeTextByQuestion[currentIndex] ?? ''}
            onChange={handleOtherTextChange}
            onSelect={handleToggleOther}
            onTextareaKeyDown={handleKeyDown}
          />
        </div>
      </div>

      <div {...stylex.props(styles.divider)} />

      <div {...stylex.props(styles.composerSection)}>
        <AiChatComposerActionsRow
          modelTierDropdownId={`ai-chat-question-model-tier-dropdown-${toolCallId}`}
          sendButton={
            <IconButton
              variant="solid"
              color="accent"
              shape="round"
              aria-label={t`Send message`}
              size="sm"
              onClick={handleSend}
              disabled={!allQuestionsAnswered || isSubmitting}
            >
              <IconArrowUp />
            </IconButton>
          }
        />
      </div>
    </div>
  );
};
