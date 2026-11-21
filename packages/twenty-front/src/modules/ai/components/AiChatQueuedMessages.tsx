import { aiChatContentContainerStyles } from '@/ai/components/StyledAiChatContentContainer';
import { plural, t } from '@lingui/core/macro';

import { useDeleteQueuedMessage } from '@/ai/hooks/useDeleteQueuedMessage';
import { agentChatQueuedMessagesFamilyState } from '@/ai/states/agentChatQueuedMessagesFamilyState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconX } from 'twenty-ui/icon';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  queueContainer: {
    gap: spacing['--t-spacing-1'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
  },
  queueLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  queuedItem: {
    background: background['--t-background-tertiary'],
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    justifyContent: 'space-between',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
  },
  queuedText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export const AiChatQueuedMessages = () => {
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);
  const agentChatQueuedMessages = useAtomFamilyStateValue(
    agentChatQueuedMessagesFamilyState,
    { threadId: currentAiChatThread },
  );
  const { deleteQueuedMessage } = useDeleteQueuedMessage();

  if (!isDefined(currentAiChatThread) || agentChatQueuedMessages.length === 0) {
    return null;
  }

  return (
    <div
      {...stylex.props(
        aiChatContentContainerStyles.root,
        styles.queueContainer,
      )}
    >
      <div {...stylex.props(styles.queueLabel)}>
        {plural(agentChatQueuedMessages.length, {
          one: '# Queued',
          other: '# Queued',
        })}
      </div>
      {agentChatQueuedMessages.map((message) => {
        const textPart = message.parts?.find((part) => part.type === 'text');
        const displayText = textPart && 'text' in textPart ? textPart.text : '';

        return (
          <div key={message.id} {...stylex.props(styles.queuedItem)}>
            <span {...stylex.props(styles.queuedText)}>{displayText}</span>
            <LightIconButton
              onClick={() => deleteQueuedMessage(message.id)}
              size="sm"
              aria-label={t`Remove queued message`}
            >
              <IconX />
            </LightIconButton>
          </div>
        );
      })}
    </div>
  );
};
