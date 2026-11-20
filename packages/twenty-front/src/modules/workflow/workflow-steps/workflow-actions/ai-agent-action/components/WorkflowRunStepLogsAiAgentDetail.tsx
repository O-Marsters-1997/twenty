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
import { logStyles } from '@/workflow/workflow-steps/workflow-actions/components/workflowRunStepLogs.stylex';
import { WorkflowRunStepLogsToolCallRow } from '@/workflow/workflow-steps/workflow-actions/ai-agent-action/components/WorkflowRunStepLogsToolCallRow';
import { formatNumber } from '@/localization/utils/formatNumber';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  font,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  modelBadge: {
    background: backgroundTransparent['--t-background-transparent-light'],
    color: fontColor['--t-font-color-tertiary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-xs'],
    whiteSpace: 'nowrap',
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-0_5'],
  },
  usageGrid: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: `${spacing['--t-spacing-1']} ${spacing['--t-spacing-4']}`,
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
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
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
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
      <div {...stylex.props(logStyles.summaryCard)}>
        <div {...stylex.props(logStyles.summaryHeader)}>
          <div {...stylex.props(logStyles.headerLeft)}>
            <IconLego size={16} />
            <span {...stylex.props(logStyles.title)}>{t`Agent run`}</span>
          </div>
          <div {...stylex.props(logStyles.badgeGroup)}>
            <span {...stylex.props(styles.modelBadge)}>{modelId}</span>
          </div>
        </div>

        <div {...stylex.props(logStyles.metricsRow)}>
          <div {...stylex.props(logStyles.metric)}>
            <div {...stylex.props(logStyles.metricLabel)}>
              <IconCpu size={12} />
              {t`Tokens`}
            </div>
            <div {...stylex.props(logStyles.metricValue)}>
              {formatTokenCount(usage.totalTokens)}
            </div>
          </div>
          <div {...stylex.props(logStyles.metric)}>
            <div {...stylex.props(logStyles.metricLabel)}>
              <IconCoins size={12} />
              {t`Cost`}
            </div>
            <div {...stylex.props(logStyles.metricValue)}>
              {formatCost(cost.totalCostInDollars)}
            </div>
          </div>
          <div {...stylex.props(logStyles.metric)}>
            <div {...stylex.props(logStyles.metricLabel)}>
              <IconTool size={12} />
              {t`Tool calls`}
            </div>
            <div {...stylex.props(logStyles.metricValue)}>
              {toolCalls.length}
            </div>
          </div>
          {nativeWebSearchCallCount > 0 && (
            <div {...stylex.props(logStyles.metric)}>
              <div {...stylex.props(logStyles.metricLabel)}>
                <IconWorld size={12} />
                {t`Web searches`}
              </div>
              <div {...stylex.props(logStyles.metricValue)}>
                {nativeWebSearchCallCount}
              </div>
            </div>
          )}
          <div {...stylex.props(logStyles.metric)}>
            <div {...stylex.props(logStyles.metricLabel)}>
              <IconClock size={12} />
              {t`Duration`}
            </div>
            <div {...stylex.props(logStyles.metricValue)}>
              {formatDuration(durationMs)}
            </div>
          </div>
        </div>
      </div>

      {usageRows.length > 0 && (
        <section {...stylex.props(logStyles.section)}>
          <h3 {...stylex.props(logStyles.sectionTitle)}>{t`Token usage`}</h3>
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
        </section>
      )}

      <section {...stylex.props(logStyles.section)}>
        <h3 {...stylex.props(logStyles.sectionTitle)}>
          {toolCalls.length > 0
            ? t`Tool calls (${toolCalls.length})`
            : t`Tool calls`}
        </h3>
        {toolCalls.length === 0 ? (
          <div
            {...stylex.props(logStyles.emptyHint)}
          >{t`No tools were called`}</div>
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
      </section>
    </>
  );
};
