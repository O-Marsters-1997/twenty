import { isDefined } from 'twenty-shared/utils';
import { t } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { LightButton } from 'twenty-ui/components/input';
import { Button } from 'twenty-ui/primitives/input';

import { serializePlainTextAsAdvancedTextEditorDocument } from '@/advanced-text-editor/utils/serializePlainTextAsAdvancedTextEditorDocument';
import { getAiChatSuggestedPrompts } from '@/ai/components/suggested-prompts/getAiChatSuggestedPrompts';
import { useAiChatSuggestedPromptsContext } from '@/ai/hooks/useAiChatSuggestedPromptsContext';
import { useStageAiChatPreprompt } from '@/ai/hooks/useStageAiChatPreprompt';
import { type SuggestedPrompt } from '@/ai/types/SuggestedPrompt';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const pickRandom = <TItem,>(items: TItem[]): TItem =>
  items[Math.floor(Math.random() * items.length)];

const styles = stylex.create({
  container: {
    padding: spacing['--t-spacing-2'],
    gap: spacing['--t-spacing-2'],
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'column',
  },
  containerCentered: {
    padding: spacing['--t-spacing-4'],
    gap: spacing['--t-spacing-4'],
    alignItems: 'center',
  },
  title: {
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    alignContent: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'grid',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    textAlign: 'left',
    height: '24px',
  },
  titleCentered: {
    fontSize: fontSize['--t-font-size-xl'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    textAlign: 'center',
    height: 'auto',
  },
  promptList: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  promptListCentered: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

type AiChatSuggestedPromptsProps = {
  isCentered?: boolean;
};

export const AiChatSuggestedPrompts = ({
  isCentered = false,
}: AiChatSuggestedPromptsProps) => {
  const { t: resolveMessage } = useLingui();
  const { stageAiChatPreprompt } = useStageAiChatPreprompt();
  const aiChatSuggestedPromptsContext = useAiChatSuggestedPromptsContext();

  const suggestedPrompts = getAiChatSuggestedPrompts(
    aiChatSuggestedPromptsContext,
  );

  const handleClick = (suggestedPrompt: SuggestedPrompt) => {
    stageAiChatPreprompt({
      serializedDocument: serializePlainTextAsAdvancedTextEditorDocument(
        resolveMessage(pickRandom(suggestedPrompt.prompts)),
      ),
      mode: suggestedPrompt.mode ?? 'PREFILL',
    });
  };

  return (
    <div
      {...stylex.props(
        styles.container,
        isCentered && styles.containerCentered,
      )}
    >
      <div {...stylex.props(styles.title, isCentered && styles.titleCentered)}>
        {t`What can I help you with?`}
      </div>
      <div
        {...stylex.props(
          styles.promptList,
          isCentered && styles.promptListCentered,
        )}
      >
        {suggestedPrompts.map((suggestedPrompt) => {
          const startIcon = isDefined(suggestedPrompt.Icon) ? (
            <suggestedPrompt.Icon />
          ) : undefined;

          return isCentered ? (
            <Button
              key={suggestedPrompt.id}
              startIcon={startIcon}
              onClick={() => handleClick(suggestedPrompt)}
              variant="outline"
            >
              {resolveMessage(suggestedPrompt.label)}
            </Button>
          ) : (
            <LightButton
              key={suggestedPrompt.id}
              startIcon={startIcon}
              onClick={() => handleClick(suggestedPrompt)}
            >
              {resolveMessage(suggestedPrompt.label)}
            </LightButton>
          );
        })}
      </div>
    </div>
  );
};
