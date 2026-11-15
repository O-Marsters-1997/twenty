import { useLingui } from '@lingui/react/macro';

import { useFormatAgentChatThreadDate } from '@/ai/hooks/useFormatAgentChatThreadDate';
import { agentChatThreadInboxStatusFamilySelector } from '@/ai/states/selectors/agentChatThreadInboxStatusFamilySelector';
import { type AgentChatThreadRecord } from '@/ai/types/AgentChatThreadRecord';
import { getAgentChatThreadLastActivityAt } from '@/ai/utils/getAgentChatThreadLastActivityAt';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { beautifyPastDateRelativeToNowShort } from '~/utils/date-utils';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  activityTime: {
    color: fontColor['--t-font-color-tertiary'],
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-sm'],
  },
});

type AiChatThreadActivityTimeProps = {
  thread: AgentChatThreadRecord;
};

export const AiChatThreadActivityTime = ({
  thread,
}: AiChatThreadActivityTimeProps) => {
  const { t } = useLingui();
  const { event } = useAtomFamilySelectorValue(
    agentChatThreadInboxStatusFamilySelector,
    thread.id,
  );
  const { formatAgentChatThreadDay } = useFormatAgentChatThreadDate();

  const getActivityTimeLabel = () => {
    switch (event?.type) {
      case 'SNOOZED': {
        const snoozedUntilDay = formatAgentChatThreadDay(new Date(event.at));

        return t`Until ${snoozedUntilDay}`;
      }
      case 'SNOOZE_ENDED':
        return t`Snooze ended`;
      case 'DONE': {
        const doneTime = beautifyPastDateRelativeToNowShort(event.at);

        return t`Done ${doneTime}`;
      }
      case 'UNSUBSCRIBED': {
        const unsubscribedTime = beautifyPastDateRelativeToNowShort(event.at);

        return t`Unsubscribed ${unsubscribedTime}`;
      }
      default:
        return beautifyPastDateRelativeToNowShort(
          getAgentChatThreadLastActivityAt(thread),
        );
    }
  };

  return <div {...stylex.props(styles.activityTime)}>{getActivityTimeLabel()}</div>;
};
