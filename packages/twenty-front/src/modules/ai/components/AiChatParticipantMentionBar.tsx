import { useLingui } from '@lingui/react/macro';
import { type Editor } from '@tiptap/react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined, TIPTAP_NODE_TYPES } from 'twenty-shared/utils';
import { LightButton } from 'twenty-ui/components/input';
import { IconUsers } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { useAiChatPendingParticipantMentions } from '@/ai/hooks/useAiChatPendingParticipantMentions';
import * as stylex from '@stylexjs/stylex';
import { background, borderRadius, fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    background: background['--t-background-tertiary'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    width: '100%',
  },
  message: {
    flex: '1',
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type AiChatParticipantMentionBarProps = {
  editor: Editor | null;
};

export const AiChatParticipantMentionBar = ({
  editor,
}: AiChatParticipantMentionBarProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const pendingParticipantMentions = useAiChatPendingParticipantMentions();

  if (pendingParticipantMentions.length === 0) {
    return null;
  }

  const participantLabels = pendingParticipantMentions
    .map(({ label }) => label)
    .join(', ');
  const message =
    pendingParticipantMentions.length === 1
      ? t`${participantLabels} will be added as a participant and get access to this chat`
      : t`${participantLabels} will be added as participants and get access to this chat`;

  // The mentions stay in the message, only without bringing anyone in
  const handleUndo = () => {
    if (!isDefined(editor)) {
      return;
    }

    const { state } = editor.view;
    const transaction = state.tr;

    state.doc.descendants((node, position) => {
      if (
        node.type.name === TIPTAP_NODE_TYPES.MENTION_TAG &&
        node.attrs.objectNameSingular ===
          CoreObjectNameSingular.WorkspaceMember &&
        node.attrs.shouldAddAsParticipant === true
      ) {
        transaction.setNodeMarkup(position, undefined, {
          ...node.attrs,
          shouldAddAsParticipant: false,
        });
      }
    });

    editor.view.dispatch(transaction);
  };

  return (
    <div role="status" {...stylex.props(styles.bar)}>
      <IconUsers size={theme.icon.size.sm} />
      <span title={message} {...stylex.props(styles.message)}>{message}</span>
      <LightButton emphasis="subtle" onClick={handleUndo}>
        {t`Undo`}
      </LightButton>
    </div>
  );
};
