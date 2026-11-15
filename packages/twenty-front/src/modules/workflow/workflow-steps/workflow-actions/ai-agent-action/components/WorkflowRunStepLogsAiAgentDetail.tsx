import { useLingui } from '@lingui/react/macro';
import { Fragment } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { type AiAgentStepLogDetails } from 'twenty-shared/workflow';
import {
  IconClock,
  IconCoins,
  IconCpu,
  IconLego,
  IconTool,
  IconWorld,
} from 'twenty-ui/icon';

import { formatDuration } from '~/utils/format/formatDuration';
import {
  StyledBadgeGroup,
  StyledEmptyHint,
  StyledHeaderLeft,
  StyledMetric,
  StyledMetricLabel,
  StyledMetricsRow,
  StyledMetricValue,
  StyledSection,
  StyledSectionTitle,
  StyledSummaryCard,
  StyledSummaryHeader,
  StyledTitle,
} from '@/workflow/workflow-steps/workflow-actions/components/workflowRunStepLogsStyles';
import { WorkflowRunStepLogsToolCallRow } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/components/WorkflowRunStepLogsToolCallRow';
import { formatNumber } from '@/localization/utils/formatNumber';
import * as stylex from '@stylexjs/stylex';
import { spacing, backgroundTransparent, borderColor, borderRadius, fontColor, fontSize, font } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  modelBadge: {
    background: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    color: fontColor['--t-font-color-tertiary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-xs'],
    paddingTop: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    whiteSpace: 'nowrap',
  },
  usageGrid: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    display: 'grid',
    gap: `${spacing['--t-spacing-1']} ${spacing['--t-spacing-4']}`,
    gridTemplateColumns: 'max-content 1fr',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  usageLabel: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  usageValue: {
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-sm'],
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
  toolList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
  },
});

const formatCost = (dollars: number): string => {
  if (dollars === 0) {
    return '$0';
  }

  if (Math.abs(dollars) < 0.01) {
    return `$${dollars.toFixed(4)}`;
  }

  return `$${formatNumber(dollars, { decimals: 2 })}`;
};

const formatTokenCount = (tokens: number): string =>
  formatNumber(tokens, { abbreviate: true, decimals: 1 });

export const WorkflowRunStepLogsAiAgentDetail = ({
  details,
}: {
  details: AiAgentStepLogDetails;
}) => {
  const { t } = useLingui();

  const {
    usage,
    cost,
    modelId,
    toolCalls,
    nativeWebSearchCallCount,
    durationMs,
  } = details;

  const usageRows = [
    { label: t`Input`, value: usage.inputTokens, show: true },
    { label: t`Output`, value: usage.outputTokens, show: true },
    {
      label: t`Reasoning`,
      value: usage.reasoningTokens,
      show: isDefined(usage.reasoningTokens) && usage.reasoningTokens > 0,
    },
    {
      label: t`Cached read`,
      value: usage.cacheReadTokens,
      show: isDefined(usage.cacheReadTokens) && usage.cacheReadTokens > 0,
    },
    {
      label: t`Cached creation`,
      value: usage.cacheCreationTokens,
      show:
        isDefined(usage.cacheCreationTokens) && usage.cacheCreationTokens > 0,
    },
  ].filter((row) => row.show);

  return (
    <>
      <StyledSummaryCard>
        <StyledSummaryHeader>
          <StyledHeaderLeft>
            <IconLego size={16} />
            <StyledTitle>{t`Agent run`}</StyledTitle>
          </StyledHeaderLeft>
          <StyledBadgeGroup>
            <span {...stylex.props(styles.modelBadge)}>{modelId}</span>
          </StyledBadgeGroup>
        </StyledSummaryHeader>

        <StyledMetricsRow>
          <StyledMetric>
            <StyledMetricLabel>
              <IconCpu size={12} />
              {t`Tokens`}
            </StyledMetricLabel>
            <StyledMetricValue>
              {formatTokenCount(usage.totalTokens)}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>
              <IconCoins size={12} />
              {t`Cost`}
            </StyledMetricLabel>
            <StyledMetricValue>
              {formatCost(cost.totalCostInDollars)}
            </StyledMetricValue>
          </StyledMetric>
          <StyledMetric>
            <StyledMetricLabel>
              <IconTool size={12} />
              {t`Tool calls`}
            </StyledMetricLabel>
            <StyledMetricValue>{toolCalls.length}</StyledMetricValue>
          </StyledMetric>
          {nativeWebSearchCallCount > 0 && (
            <StyledMetric>
              <StyledMetricLabel>
                <IconWorld size={12} />
                {t`Web searches`}
              </StyledMetricLabel>
              <StyledMetricValue>{nativeWebSearchCallCount}</StyledMetricValue>
            </StyledMetric>
          )}
          <StyledMetric>
            <StyledMetricLabel>
              <IconClock size={12} />
              {t`Duration`}
            </StyledMetricLabel>
            <StyledMetricValue>{formatDuration(durationMs)}</StyledMetricValue>
          </StyledMetric>
        </StyledMetricsRow>
      </StyledSummaryCard>

      {usageRows.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>{t`Token usage`}</StyledSectionTitle>
          <div {...stylex.props(styles.usageGrid)}>
            {usageRows.map((row) => (
              <Fragment key={row.label}>
                <span {...stylex.props(styles.usageLabel)}>{row.label}</span>
                <span {...stylex.props(styles.usageValue)}>
                  {formatNumber(row.value ?? 0)}
                </span>
              </Fragment>
            ))}
          </div>
        </StyledSection>
      )}

      <StyledSection>
        <StyledSectionTitle>
          {toolCalls.length > 0
            ? t`Tool calls (${toolCalls.length})`
            : t`Tool calls`}
        </StyledSectionTitle>
        {toolCalls.length === 0 ? (
          <StyledEmptyHint>{t`No tools were called`}</StyledEmptyHint>
        ) : (
          <div {...stylex.props(styles.toolList)}>
            {toolCalls.map((toolCall) => (
              <WorkflowRunStepLogsToolCallRow
                key={toolCall.toolCallId}
                toolCall={toolCall}
              />
            ))}
          </div>
        )}
      </StyledSection>
    </>
  );
};
