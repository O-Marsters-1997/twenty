import { plural } from '@lingui/core/macro';
import { IconChevronDown, IconChevronRight } from 'twenty-ui/icon';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';

import { CoreAgentRunRow } from '@/object-core/agents/components/CoreAgentRunRow';
import { CoreAgentRunStatus } from '@/object-core/agents/components/CoreAgentRunStatus';
import { CORE_AGENT_RUNS_GRID_TEMPLATE_COLUMNS } from '@/object-core/agents/constants/CoreAgentRunsGridTemplateColumns';
import { type CoreAgentRun } from '@/object-core/agents/types/CoreAgentRun';
import { handleCoreAgentRunToggleKeyDown } from '@/object-core/agents/utils/handleCoreAgentRunToggleKeyDown';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { beautifyPastDateRelativeToNow } from '~/utils/date-utils';

type CoreAgentRunConversationProps = {
  title: string | null;
  runs: CoreAgentRun[];
  isExpanded: boolean;
  onToggle: () => void;
  expandedRunIds: Set<string>;
  onToggleRun: (runId: string) => void;
};

export const CoreAgentRunConversation = ({
  title,
  runs,
  isExpanded,
  onToggle,
  expandedRunIds,
  onToggleRun,
}: CoreAgentRunConversationProps) => {
  const theme = useTheme();
  const [latestRun] = runs;
  const ChevronIcon = isExpanded ? IconChevronDown : IconChevronRight;
  const runCount = runs.length;

  return (
    <>
      <TableRow
        gridTemplateColumns={CORE_AGENT_RUNS_GRID_TEMPLATE_COLUMNS}
        isExpanded={isExpanded}
        onClick={onToggle}
        onKeyDown={handleCoreAgentRunToggleKeyDown(onToggle)}
        role="button"
        tabIndex={0}
        ariaExpanded={isExpanded}
      >
        <TableCell gap={themeCssVariables.spacing[1]}>
          <ChevronIcon
            size={theme.icon.size.sm}
            stroke={theme.icon.stroke.sm}
          />
          <CoreAgentRunStatus status={latestRun.status} />
        </TableCell>
        <TableCell color={themeCssVariables.font.color.tertiary}>
          {beautifyPastDateRelativeToNow(
            latestRun.startedAt ?? latestRun.createdAt,
          )}
        </TableCell>
        <TableCell color={themeCssVariables.font.color.secondary}>
          {plural(runCount, { one: '# run', other: '# runs' })}
        </TableCell>
        <TableCell overflow="hidden">
          <OverflowingTextWithTooltip
            text={<>{title ?? latestRun.input}</>}
            tooltipContent={title ?? latestRun.input ?? ''}
          />
        </TableCell>
        <TableCell />
        <TableCell />
      </TableRow>
      {isExpanded &&
        runs.map((run) => (
          <CoreAgentRunRow
            key={run.id}
            run={run}
            isNested
            isExpanded={expandedRunIds.has(run.id)}
            onToggle={() => onToggleRun(run.id)}
          />
        ))}
    </>
  );
};
