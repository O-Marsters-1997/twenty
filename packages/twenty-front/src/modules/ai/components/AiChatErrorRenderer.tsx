import { AiChatApiKeyNotConfiguredMessage } from '@/ai/components/AiChatApiKeyNotConfiguredMessage';
import { AiChatErrorMessage } from '@/ai/components/AiChatErrorMessage';
import { useCanRetryCurrentAiChatTurn } from '@/ai/hooks/useCanRetryCurrentAiChatTurn';
import { useRetryChatMessage } from '@/ai/hooks/useRetryChatMessage';
import { type AiChatError } from '@/ai/types/AiChatError';
import { AiChatErrorCode } from '@/ai/utils/aiChatErrorCode';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

type AiChatErrorRendererProps = {
  error: AiChatError;
};

export const AiChatErrorRenderer = ({ error }: AiChatErrorRendererProps) => {
  const { retryChatMessage } = useRetryChatMessage();
  const canRetry = useCanRetryCurrentAiChatTurn();

  if (isGraphqlErrorOfType(error, AiChatErrorCode.API_KEY_NOT_CONFIGURED)) {
    return <AiChatApiKeyNotConfiguredMessage />;
  }

  if (
    isGraphqlErrorOfType(error, AiChatErrorCode.CONTEXT_WINDOW_EXCEEDED) ||
    isGraphqlErrorOfType(error, AiChatErrorCode.CONNECTION_LOST)
  ) {
    return <AiChatErrorMessage error={error} />;
  }

  return (
    <AiChatErrorMessage
      error={error}
      onRetry={canRetry ? retryChatMessage : undefined}
    />
  );
};
