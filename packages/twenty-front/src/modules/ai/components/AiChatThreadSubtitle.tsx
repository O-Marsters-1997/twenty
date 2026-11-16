import { useLingui } from '@lingui/react/macro';
import { isDefined, isNonEmptyString } from 'twenty-shared/utils';
import { IconHandClick } from 'twenty-ui/icon';
import { VisuallyHidden } from 'twenty-ui/primitives/accessibility';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';

import { useIsAgentChatThreadShownAsUnread } from '@/ai/hooks/useIsAgentChatThreadShownAsUnread';
import { type AgentChatThreadRecord } from '@/ai/types/AgentChatThreadRecord';
import { getAgentChatThreadPreviewText } from '@/ai/utils/getAgentChatThreadPreviewText';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { getWorkspaceMemberNameOrEmail } from '@/workspace-member/utils/getWorkspaceMemberNameOrEmail';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import {
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  needsInput: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: 0,
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
  },
  needsInputUnread: {
    color: color['--t-color-blue'],
  },
  subtitle: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-1'],
    minHeight: spacing['--t-spacing-4'],
    minWidth: '0',
  },
  preview: {
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  assignee: {
    display: 'flex',
    flexShrink: '0',
    marginLeft: 'auto',
  },
});

type AiChatThreadSubtitleProps = {
  thread: AgentChatThreadRecord;
};

export const AiChatThreadSubtitle = ({ thread }: AiChatThreadSubtitleProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const isUnread = useIsAgentChatThreadShownAsUnread(thread);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );
  const assignee = currentWorkspaceMembers.find(
    (workspaceMember) => workspaceMember.id === thread.assigneeId,
  );
  const assigneeName = isDefined(assignee)
    ? getWorkspaceMemberNameOrEmail(assignee)
    : undefined;
  const isAwaitingAnswer =
    !isDefined(thread.deletedAt) && isDefined(thread.pendingQuestionMessageId);
  const previewText = getAgentChatThreadPreviewText({
    thread,
    workspaceMembers: currentWorkspaceMembers,
    currentWorkspaceMemberId: currentWorkspaceMember?.id,
  });

  return (
    <div {...stylex.props(styles.subtitle)}>
      {isAwaitingAnswer && (
        <div
          {...stylex.props(
            styles.needsInput,
            isUnread && styles.needsInputUnread,
          )}
        >
          <IconHandClick size={theme.icon.size.sm} />
          {t`Needs input`}
        </div>
      )}
      {isAwaitingAnswer && isNonEmptyString(previewText) && (
        <span aria-hidden>·</span>
      )}
      <div {...stylex.props(styles.preview)}>{previewText}</div>
      {isDefined(assignee) && (
        <div
          title={t`Assigned to ${assigneeName}`}
          {...stylex.props(styles.assignee)}
        >
          <Avatar
            src={getAbsoluteImageUrl(assignee.avatarUrl)}
            colorSeed={assignee.id}
            name={assigneeName}
            size="xs"
            shape="circle"
          />
          <VisuallyHidden>{t`, assigned to ${assigneeName}`}</VisuallyHidden>
        </div>
      )}
    </div>
  );
};
