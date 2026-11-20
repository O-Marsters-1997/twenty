import { formatAiChatTokens } from '@/ai/utils/formatAiChatTokens';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { MetricRow } from 'twenty-ui/components/data-display';
import { Separator } from 'twenty-ui/primitives/layout';
import { IconArrowUp, IconArrowDown, IconHistory } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { agentChatUsageFamilyState } from '@/ai/states/agentChatUsageFamilyState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  section: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    height: '20px',
  },
});

export const AiChatContextUsageDetails = () => {
  const { t } = useLingui();
  const theme = useTheme();
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);
  const agentChatUsage = useAtomFamilyStateValue(agentChatUsageFamilyState, {
    threadId: currentAiChatThread,
  });
  if (!isDefined(agentChatUsage)) {
    return null;
  }

  const lastMessage = agentChatUsage.lastMessage;

  return (
    <>
      {isDefined(lastMessage) && (
        <>
          <Separator />
          <div {...stylex.props(styles.section)}>
            <span
              {...stylex.props(styles.sectionTitle)}
            >{t`Last message`}</span>
            <MetricRow
              startIcon={<IconArrowUp size={theme.icon.size.sm} />}
              value={formatAiChatTokens(lastMessage.inputTokens)}
            >
              {t`Input tokens`}
            </MetricRow>
            <MetricRow
              startIcon={<IconHistory size={theme.icon.size.sm} />}
              value={formatAiChatTokens(lastMessage.cachedInputTokens)}
            >
              {t`Cached input`}
            </MetricRow>
            <MetricRow
              startIcon={<IconArrowDown size={theme.icon.size.sm} />}
              value={formatAiChatTokens(lastMessage.outputTokens)}
            >
              {t`Output tokens`}
            </MetricRow>
          </div>
        </>
      )}
      <Separator />
      <div {...stylex.props(styles.section)}>
        <span {...stylex.props(styles.sectionTitle)}>{t`Conversation`}</span>
        <MetricRow
          startIcon={<IconArrowUp size={theme.icon.size.sm} />}
          value={formatAiChatTokens(agentChatUsage.inputTokens)}
        >
          {t`Input tokens`}
        </MetricRow>
        <MetricRow
          startIcon={<IconHistory size={theme.icon.size.sm} />}
          value={formatAiChatTokens(agentChatUsage.cachedInputTokens)}
        >
          {t`Cached input`}
        </MetricRow>
        <MetricRow
          startIcon={<IconArrowDown size={theme.icon.size.sm} />}
          value={formatAiChatTokens(agentChatUsage.outputTokens)}
        >
          {t`Output tokens`}
        </MetricRow>
      </div>
    </>
  );
};
