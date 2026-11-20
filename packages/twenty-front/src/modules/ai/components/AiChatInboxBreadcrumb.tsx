import { useLingui } from '@lingui/react/macro';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { useTheme } from 'twenty-ui/theme';

import { AGENT_CHAT_THREAD_FILTER_STATUS_ICONS } from '@/ai/constants/AgentChatThreadFilterStatusIcons';
import { AGENT_CHAT_THREAD_FILTER_STATUS_LABELS } from '@/ai/constants/AgentChatThreadFilterStatusLabels';
import { agentChatThreadFilterStatusState } from '@/ai/states/agentChatThreadFilterStatusState';
import { UndecoratedLink } from '@/ui/navigation/link/components/UndecoratedLink/UndecoratedLink';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  breadcrumb: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: '0',
    fontWeight: fontWeight['--t-font-weight-medium'],
    whiteSpace: 'nowrap',
  },
});

export const AiChatInboxBreadcrumb = () => {
  const { t } = useLingui();
  const theme = useTheme();
  const agentChatThreadFilterStatus = useAtomStateValue(
    agentChatThreadFilterStatusState,
  );
  const FilterStatusIcon =
    AGENT_CHAT_THREAD_FILTER_STATUS_ICONS[agentChatThreadFilterStatus];

  return (
    <UndecoratedLink to={getAppPath(AppPath.AiChatInbox, { threadId: null })}>
      <span {...stylex.props(styles.breadcrumb)}>
        <FilterStatusIcon size={theme.icon.size.md} />
        {t(AGENT_CHAT_THREAD_FILTER_STATUS_LABELS[agentChatThreadFilterStatus])}
        <span aria-hidden>/</span>
      </span>
    </UndecoratedLink>
  );
};
