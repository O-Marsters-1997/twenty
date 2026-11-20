import { useCurrentAiChatThreadAccess } from '@/ai/hooks/useCurrentAiChatThreadAccess';
import { EditorContent } from '@tiptap/react';
import { useLingui } from '@lingui/react/macro';

import { AiChatInlineBanner } from '@/ai/components/AiChatInlineBanner';
import { AiChatEmptyState } from '@/ai/components/AiChatEmptyState';
import { AiChatParticipantMentionBar } from '@/ai/components/AiChatParticipantMentionBar';
import { AiChatPendingAskGate } from '@/ai/components/AiChatPendingAskGate';
import { AiChatStandaloneError } from '@/ai/components/AiChatStandaloneError';
import { AgentChatContextPreview } from '@/ai/components/internal/AgentChatContextPreview';
import { AiChatAddMenu } from '@/ai/components/AiChatAddMenu';
import { AiChatComposerActionsRow } from '@/ai/components/internal/AiChatComposerActionsRow';
import { AiChatEditorFocusEffect } from '@/ai/components/internal/AiChatEditorFocusEffect';
import { AiChatSentMessageHandOffEffect } from '@/ai/components/internal/AiChatSentMessageHandOffEffect';
import { SendMessageButton } from '@/ai/components/internal/SendMessageButton';
import { useAiChatEditor } from '@/ai/hooks/useAiChatEditor';
import { useIsAiChatComposerCentered } from '@/ai/hooks/useIsAiChatComposerCentered';
import { agentChatHasMessageSelector } from '@/ai/states/selectors/agentChatHasMessageSelector';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { useIsMobile } from 'twenty-ui/utilities';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  colorTransparent,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { aiChatContentContainerStyles } from '@/ai/components/StyledAiChatContentContainer';
import '~/third-party-styles/ai-chat-content.css';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  inputArea: {
    gap: spacing['--t-spacing-2'],
    paddingBlock: spacing['--t-spacing-3'],
    paddingInline: spacing['--t-spacing-3'],
    alignItems: 'flex-end',
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    marginTop: 'auto',
  },
  inputAreaMobile: {
    paddingBlock: 0,
  },
  inputBox: {
    padding: spacing['--t-spacing-2'],
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus-within': color['--t-color-blue'],
    },
    borderRadius: `calc(${borderRadius['--t-border-radius-md']} + ${spacing['--t-spacing-1']})`,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-2'],
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxShadow: {
      default: null,
      ':focus-within': `0px 0px 0px 3px ${colorTransparent['--t-color-transparent-blue2']}`,
    },
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '140px',
    width: '100%',
  },
  inputBoxMobile: {
    minHeight: 'auto',
  },
  editorWrapper: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  composerBottomSpacer: {
    flexBasis: 0,
    flexGrow: 0,
    flexShrink: 0,
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: {
      default: 'flex-grow',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'ease-out',
  },
  composerBottomSpacerCentered: {
    flexGrow: 1,
    transitionProperty: 'none',
  },
  messageListPlaceholder: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  },
});

const EditableAiChatEditorSection = () => {
  const { t } = useLingui();
  const isMobile = useIsMobile();
  const isComposerCentered = useIsAiChatComposerCentered();
  const aiModels = useAtomStateValue(aiModelsState);
  const hasNoEnabledModels = aiModels.length === 0;

  const { editor, handleSendAndClear } = useAiChatEditor();

  const composer = (
    <div {...stylex.props(styles.inputBox, isMobile && styles.inputBoxMobile)}>
      <div {...stylex.props(styles.editorWrapper)}>
        <EditorContent
          className={
            isMobile ? 'ai-chat-editor ai-chat-editor-mobile' : 'ai-chat-editor'
          }
          editor={editor}
        />
      </div>
      <AiChatComposerActionsRow
        leftActions={<AiChatAddMenu editor={editor} />}
        modelTierDropdownId="ai-chat-model-tier-dropdown"
        sendButton={
          <SendMessageButton
            onSend={handleSendAndClear}
            isDisabled={hasNoEnabledModels}
          />
        }
      />
    </div>
  );
  const agentChatHasMessage = useAtomStateValue(agentChatHasMessageSelector);

  return (
    <>
      <AiChatEditorFocusEffect editor={editor} />
      <AiChatSentMessageHandOffEffect
        editor={editor}
        isComposerCentered={isComposerCentered}
      />
      {!agentChatHasMessage && (
        <div {...stylex.props(styles.messageListPlaceholder)}>
          <AiChatEmptyState isCentered={isComposerCentered} />
          <AiChatStandaloneError />
        </div>
      )}

      <div
        {...stylex.props(
          aiChatContentContainerStyles.root,
          styles.inputArea,
          isMobile && styles.inputAreaMobile,
        )}
      >
        <AgentChatContextPreview />
        {hasNoEnabledModels && (
          <AiChatInlineBanner>{t`No AI provider is configured on this instance.`}</AiChatInlineBanner>
        )}
        <AiChatParticipantMentionBar editor={editor} />
        <AiChatPendingAskGate>{composer}</AiChatPendingAskGate>
      </div>
      <div
        {...stylex.props(
          styles.composerBottomSpacer,
          isComposerCentered && styles.composerBottomSpacerCentered,
        )}
      />
    </>
  );
};

export const AiChatEditorSection = () => {
  const { t } = useLingui();
  const isMobile = useIsMobile();
  const access = useCurrentAiChatThreadAccess();
  if (access !== 'writer') {
    return (
      <div
        {...stylex.props(
          aiChatContentContainerStyles.root,
          styles.inputArea,
          isMobile && styles.inputAreaMobile,
        )}
      >
        <div role="status">
          {access === 'loading'
            ? t`Loading conversation…`
            : access === 'unavailable'
              ? t`This conversation is no longer available.`
              : t`View only — You can read this conversation.`}
        </div>
        <AiChatStandaloneError />
      </div>
    );
  }
  return <EditableAiChatEditorSection />;
};
