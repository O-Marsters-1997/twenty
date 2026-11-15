import { MarkdownRenderer } from '@/ai/components/MarkdownRenderer';
import { aiChatContentContainerStyles } from '@/ai/components/StyledAiChatContentContainer';

import { AiChatSuggestedPrompts } from '@/ai/components/suggested-prompts/AiChatSuggestedPrompts';
import { useShouldShowAiChatEmptyState } from '@/ai/hooks/useShouldShowAiChatEmptyState';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  root: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
});

type AiChatEmptyStateProps = {
  isCentered?: boolean;
};

export const AiChatEmptyState = ({
  isCentered = false,
}: AiChatEmptyStateProps) => {
  const shouldShowAiChatEmptyState = useShouldShowAiChatEmptyState();

  MarkdownRenderer.preload();

  if (!shouldShowAiChatEmptyState) {
    return null;
  }

  return (
    <div
      {...stylex.props(aiChatContentContainerStyles.root, styles.root)}
    >
      <AiChatSuggestedPrompts isCentered={isCentered} />
    </div>
  );
};
