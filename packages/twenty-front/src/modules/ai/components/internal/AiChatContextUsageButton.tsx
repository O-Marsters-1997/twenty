import { formatAiChatTokens } from '@/ai/utils/formatAiChatTokens';
import { FloatingPortal, useTransitionStyles } from '@floating-ui/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { isDefined } from 'twenty-shared/utils';
import { MetricRow } from 'twenty-ui/components/data-display';
import { ProgressRing } from 'twenty-ui/primitives/feedback';
import { Button } from 'twenty-ui/primitives/input';
import { IconWindow } from 'twenty-ui/icon';
import { Separator } from 'twenty-ui/primitives/layout';
import { useTheme } from 'twenty-ui/theme';

import { AiChatContextUsageDetails } from '@/ai/components/internal/AiChatContextUsageDetails';
import { useAiChatHoverCard } from '@/ai/hooks/useAiChatHoverCard';
import { useAiModelTiers } from '@/ai/hooks/useAiModelTiers';
import { useWorkspaceAiModelTiers } from '@/ai/hooks/useWorkspaceAiModelTiers';
import { useIsWorkspaceSetupChat } from '@/ai/hooks/useIsWorkspaceSetupChat';
import { agentChatUsageFamilyState } from '@/ai/states/agentChatUsageFamilyState';
import { agentChatUserSelectedModelTierState } from '@/ai/states/agentChatUserSelectedModelTierState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { getContextWindowRingColor } from '@/ai/utils/getContextWindowRingColor';
import { StyledInformationCard } from '@/ui/layout/information-card/components/StyledInformationCard';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { formatNumber } from '@/localization/utils/formatNumber';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  color,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  trigger: {
    background: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderStyle: 'none',
    outline: {
      default: null,
      ':focus-visible': `2px solid ${color['--t-color-blue']}`,
    },
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    height: '24px',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
    width: '24px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: spacing['--t-spacing-1'],
  },
});

export const AiChatContextUsageButton = () => {
  const { t } = useLingui();
  const theme = useTheme();

  const shouldReduceMotion = useReducedMotion();

  const [showDetails, setShowDetails] = useState(false);

  const { context, refs, floatingStyles, getReferenceProps, getFloatingProps } =
    useAiChatHoverCard({
      placement: 'top-start',
      role: 'dialog',
      onOpen: () => setShowDetails(false),
    });

  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);

  const agentChatUsage = useAtomFamilyStateValue(agentChatUsageFamilyState, {
    threadId: currentAiChatThread,
  });

  const tiers = useAiModelTiers();

  const { chatTier } = useWorkspaceAiModelTiers();

  const agentChatUserSelectedModelTier = useAtomStateValue(
    agentChatUserSelectedModelTierState,
  );

  const isWorkspaceSetupChat = useIsWorkspaceSetupChat();

  const modelTier = isWorkspaceSetupChat
    ? 'fast'
    : (agentChatUserSelectedModelTier ?? chatTier);

  const contextWindow =
    agentChatUsage?.contextWindowTokens ??
    tiers.find(({ tier }) => tier === modelTier)?.model?.contextWindowTokens ??
    0;

  const conversationSize = agentChatUsage?.conversationSize ?? 0;

  const percentage =
    contextWindow > 0
      ? Math.min(100, Math.max(0, (conversationSize / contextWindow) * 100))
      : 0;

  const formattedPercentage = formatNumber(percentage, { decimals: 1 });

  const formattedConversationSize = formatAiChatTokens(conversationSize);

  const formattedContextWindow = formatAiChatTokens(contextWindow);

  const contextWindowRingColor = getContextWindowRingColor(percentage);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: shouldReduceMotion ? 0 : { open: 150, close: 100 },
    initial: { opacity: 0 },
  });

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-label={
          contextWindow > 0
            ? t`Context and usage, ${formattedPercentage}% of context window used`
            : t`Context and usage, context window unavailable`
        }
        // oxlint-disable-next-line react/jsx-props-no-spreading
        {...getReferenceProps()}
        {...stylex.props(styles.trigger)}
      >
        <ProgressRing
          value={percentage}
          aria-hidden
          barColor={contextWindowRingColor}
          render={<span />}
        />
      </button>
      {isMounted && (
        <FloatingPortal>
          <StyledInformationCard
            ref={refs.setFloating}
            style={{ ...floatingStyles, ...transitionStyles }}
            aria-label={t`Context and usage`}
            // oxlint-disable-next-line react/jsx-props-no-spreading
            {...getFloatingProps()}
          >
            <MetricRow
              startIcon={<IconWindow size={theme.icon.size.sm} />}
              progress={percentage}
              value={
                contextWindow > 0
                  ? `(${formattedConversationSize}/${formattedContextWindow}) ${formattedPercentage}%`
                  : t`Not available`
              }
              progressValueText={
                contextWindow > 0
                  ? t`${formattedPercentage}% used, ${formattedConversationSize} of ${formattedContextWindow} tokens`
                  : undefined
              }
              progressColor={contextWindowRingColor}
            >
              {t`Context window`}
            </MetricRow>
            {showDetails && <AiChatContextUsageDetails />}
            {isDefined(agentChatUsage) && (
              <>
                <Separator />
                <div {...stylex.props(styles.footer)}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? t`Less` : t`More`}
                  </Button>
                </div>
              </>
            )}
          </StyledInformationCard>
        </FloatingPortal>
      )}
    </>
  );
};
