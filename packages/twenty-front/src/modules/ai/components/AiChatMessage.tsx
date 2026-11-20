import { useLingui } from '@lingui/react/macro';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { useAiChatSentMessageHandOff } from '@/ai/hooks/useAiChatSentMessageHandOff';
import { type ReactNode } from 'react';

import { AgentChatFilePreview } from '@/ai/components/internal/AgentChatFilePreview';
import { AGENT_MESSAGE_ROLE } from '@/ai/constants/AgentMessageRole';

import { AiChatAssistantMessageRenderer } from '@/ai/components/AiChatAssistantMessageRenderer';
import { AiChatErrorRenderer } from '@/ai/components/AiChatErrorRenderer';
import { agentChatFirstUnreadMessageIdSelector } from '@/ai/states/selectors/agentChatFirstUnreadMessageIdSelector';
import { agentChatIsMessageBeforeFirstUserMessageFamilySelector } from '@/ai/states/selectors/agentChatIsMessageBeforeFirstUserMessageFamilySelector';
import { agentChatMessageFamilySelector } from '@/ai/states/selectors/agentChatMessageFamilySelector';
import { getAgentChatSenderLabel } from '@/ai/utils/getAgentChatSenderLabel';
import { getAgentChatMessageWorkDurationMs } from '@/ai/utils/getAgentChatMessageWorkDurationMs';
import { type AiChatError } from '@/ai/types/AiChatError';
import { LightCopyIconButton } from '@/ui/input/components/LightCopyIconButton';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

import { isExtendedFileUIPart } from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';
import { LabeledDivider } from '@/ui/layout/line/components/LabeledDivider';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import { beautifyPastDateRelativeToNow } from '~/utils/date-utils';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { bubbleMarker } from './AiChatMessage.stylex';
import {
  animationDuration,
  background,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import '~/third-party-styles/ai-chat-content.css';

const styles = stylex.create({
  bubble: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    width: '100%',
  },
  bubbleUser: {
    alignItems: 'flex-end',
  },
  messageText: {
    borderRadius: 0,
    paddingBlock: 0,
    paddingInline: 0,
    backgroundColor: 'transparent',
    color: fontColor['--t-font-color-primary'],
    fontWeight: 400,
    lineHeight: '1.4em',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    maxWidth: '100%',
    width: '100%',
  },
  messageTextUser: {
    borderRadius: borderRadius['--t-border-radius-lg'],
    paddingInline: spacing['--t-spacing-2'],
    backgroundColor: background['--t-background-tertiary'],
    fontWeight: 500,
    width: 'fit-content',
  },
  messageFooter: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    justifyContent: 'space-between',
    opacity: { default: 0, [stylex.when.ancestor(':hover', bubbleMarker)]: 1 },
    pointerEvents: {
      default: 'none',
      [stylex.when.ancestor(':hover', bubbleMarker)]: 'auto',
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease-in-out',
    marginTop: spacing['--t-spacing-1'],
    width: '100%',
  },
  messageContainer: {
    maxWidth: '100%',
    minWidth: 0,
    width: '100%',
  },
  messageContainerUser: {
    width: 'fit-content',
  },
  sender: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    marginBottom: spacing['--t-spacing-1'],
  },
  messageTimestamp: {
    color: fontColor['--t-font-color-light'],
  },
  filesContainer: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing['--t-spacing-2'],
  },
});

type AiChatUserMessageTextProps = {
  messageId: string;
  children: ReactNode;
};

const AiChatUserMessageText = ({
  messageId,
  children,
}: AiChatUserMessageTextProps) => {
  const sentMessageHandOffRef = useAiChatSentMessageHandOff(messageId);

  return (
    <div
      ref={sentMessageHandOffRef}
      {...stylex.props(styles.messageText, styles.messageTextUser)}
    >
      <div className="chat-message-text chat-message-text-user">{children}</div>
    </div>
  );
};

type AiChatMessageProps = {
  messageId: string;
  isLastMessageStreaming?: boolean;
  error?: AiChatError;
};

export const AiChatMessage = ({
  messageId,
  isLastMessageStreaming = false,
  error,
}: AiChatMessageProps) => {
  const { t } = useLingui();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );
  const agentChatMessage = useAtomFamilySelectorValue(
    agentChatMessageFamilySelector,
    { messageId },
  );

  const isMessageBeforeFirstUserMessage = useAtomFamilySelectorValue(
    agentChatIsMessageBeforeFirstUserMessageFamilySelector,
    { messageId },
  );

  const { localeCatalog } = useAtomStateValue(dateLocaleState);
  const agentChatFirstUnreadMessageId = useAtomStateValue(
    agentChatFirstUnreadMessageIdSelector,
  );
  const isAiChatInboxEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_AI_CHAT_INBOX_ENABLED,
  );

  if (!isDefined(agentChatMessage)) {
    return null;
  }

  const senderId = agentChatMessage.metadata?.senderWorkspaceMemberId;
  const sender = currentWorkspaceMembers.find(
    (member) => isDefined(senderId) && member.id === senderId,
  );
  const senderLabel = getAgentChatSenderLabel({
    sender,
    isCurrentWorkspaceMember: senderId === currentWorkspaceMember?.id,
  });
  const isUser = agentChatMessage.role === AGENT_MESSAGE_ROLE.USER;
  const shouldShowError =
    isDefined(error) && agentChatMessage.role === AGENT_MESSAGE_ROLE.ASSISTANT;

  const fileParts = agentChatMessage.parts.filter(isExtendedFileUIPart);
  const messageContent = (
    <AiChatAssistantMessageRenderer
      isLastMessageStreaming={isLastMessageStreaming}
      messageParts={agentChatMessage.parts}
      hasError={shouldShowError}
      shouldHideThinkingSteps={isMessageBeforeFirstUserMessage}
      workDurationMs={getAgentChatMessageWorkDurationMs({
        metadata: agentChatMessage.metadata,
        isStreaming: isLastMessageStreaming,
      })}
    />
  );

  return (
    <>
      {isAiChatInboxEnabled && agentChatFirstUnreadMessageId === messageId && (
        <LabeledDivider
          textPosition="end"
          color={themeCssVariables.tag.text.red}
          noMargin
        >{t`New`}</LabeledDivider>
      )}
      <div
        {...stylex.props(
          styles.bubble,
          bubbleMarker,
          isUser && styles.bubbleUser,
        )}
      >
        {isUser && isDefined(senderId) && (
          <div {...stylex.props(styles.sender)}>{senderLabel}</div>
        )}
        <div
          {...stylex.props(
            styles.messageContainer,
            isUser && styles.messageContainerUser,
          )}
        >
          {isUser ? (
            <AiChatUserMessageText messageId={messageId}>
              {messageContent}
            </AiChatUserMessageText>
          ) : (
            <div {...stylex.props(styles.messageText)}>
              <div className="chat-message-text">{messageContent}</div>
            </div>
          )}
          {fileParts.length > 0 && (
            <div {...stylex.props(styles.filesContainer)}>
              {fileParts.map((file) => (
                <AgentChatFilePreview key={file.filename} file={file} />
              ))}
            </div>
          )}
          {shouldShowError && <AiChatErrorRenderer error={error} />}
        </div>
        {agentChatMessage.parts.length > 0 && (
          <div {...stylex.props(styles.messageFooter)}>
            <span {...stylex.props(styles.messageTimestamp)}>
              {beautifyPastDateRelativeToNow(
                agentChatMessage.metadata?.createdAt ?? new Date(),
                localeCatalog,
              )}
            </span>
            <LightCopyIconButton
              copyText={
                agentChatMessage.parts.find((part) => part.type === 'text')
                  ?.text ?? ''
              }
            />
          </div>
        )}
      </div>
    </>
  );
};
