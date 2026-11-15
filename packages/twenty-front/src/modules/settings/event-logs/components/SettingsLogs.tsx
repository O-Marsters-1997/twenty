import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isClickHouseConfiguredState } from '@/client-config/states/isClickHouseConfiguredState';
import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { SettingsEmptyPlaceholder } from '@/settings/components/SettingsEmptyPlaceholder';
import { SettingsOptionCardContentButton } from '@/settings/components/SettingsOptions/SettingsOptionCardContentButton';
import { EventLogFilters } from '@/settings/event-logs/components/EventLogFilters';
import { EventLogResultsTable } from '@/settings/event-logs/components/EventLogResultsTable';
import { EventLogTableSelector } from '@/settings/event-logs/components/EventLogTableSelector';
import { useEventLogsLiveStream } from '@/settings/event-logs/hooks/useEventLogsLiveStream';
import { useEventLogs } from '@/settings/event-logs/hooks/useQueryEventLogs';
import { type EventLogFiltersState } from '@/settings/event-logs/types/EventLogFiltersState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { SettingsPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import {
  IconArrowUp,
  IconLock,
  IconPlayerPause,
  IconPlayerPlay,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { IconButton } from 'twenty-ui/components/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { themeCssVariables } from 'twenty-ui/theme';

import { EventLogTable } from '~/generated-metadata/graphql';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-6'],
    marginTop: '0',
    marginRight: 'auto',
    marginBottom: '0',
    marginLeft: 'auto',
    maxWidth: '760px',
    minHeight: '0',
    paddingTop: spacing['--t-spacing-6'],
    paddingRight: spacing['--t-spacing-8'],
    paddingBottom: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-8'],
    width: '100%',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
  },
  selectorRow: {
    alignItems: 'flex-end',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  selectorGrow: {
    flex: '1',
    minWidth: '0',
  },
  results: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    minHeight: '0',
  },
  recordCount: {
    alignSelf: 'flex-end',
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  tableWrapper: {
    flex: '1',
    minHeight: '0',
    overflow: 'hidden',
  },
});

const RECORDS_PER_PAGE = 100;

export const SettingsLogs = () => {
  const { t } = useLingui();
  const { formatNumber } = useNumberFormat();

  const isClickHouseConfigured = useAtomStateValue(isClickHouseConfiguredState);

  const [selectedTable, setSelectedTable] = useState<EventLogTable>(
    EventLogTable.PAGEVIEW,
  );
  const [filters, setFilters] = useState<EventLogFiltersState>({});
  const [isPaused, setIsPaused] = useState(false);

  const canQuery = isClickHouseConfigured;

  const { records, totalCount, hasNextPage, loading, error, loadMore } =
    useEventLogs(
      {
        table: selectedTable,
        filters: {
          eventType: filters.eventType,
          userWorkspaceId: filters.userWorkspaceId,
          dateRange: filters.dateRange
            ? {
                start: filters.dateRange.start?.toISOString(),
                end: filters.dateRange.end?.toISOString(),
              }
            : undefined,
          recordId: filters.recordId,
          objectMetadataId: filters.objectMetadataId,
        },
        first: RECORDS_PER_PAGE,
      },
      { skip: !canQuery },
    );

  const hasActiveFilters =
    isDefined(filters.eventType) ||
    isDefined(filters.userWorkspaceId) ||
    isDefined(filters.recordId) ||
    isDefined(filters.objectMetadataId) ||
    isDefined(filters.dateRange?.start) ||
    isDefined(filters.dateRange?.end);

  const { liveRecords } = useEventLogsLiveStream({
    table: selectedTable,
    enabled: !isPaused && !hasActiveFilters && canQuery,
  });

  const displayedRecords = useMemo(
    () => [...liveRecords, ...records],
    [liveRecords, records],
  );

  const handleTableChange = (table: EventLogTable) => {
    setSelectedTable(table);
    setFilters({});
  };

  const handleFiltersChange = (newFilters: EventLogFiltersState) => {
    setFilters(newFilters);
  };

  const renderResults = () => {
    if (!isClickHouseConfigured) {
      return (
        <SettingsEmptyPlaceholder>
          {t`Logs require ClickHouse to be configured. Please contact your administrator.`}
        </SettingsEmptyPlaceholder>
      );
    }

    if (isDefined(error)) {
      return (
        <SettingsEmptyPlaceholder>
          {t`Something went wrong while loading logs. Please try again.`}
        </SettingsEmptyPlaceholder>
      );
    }

    return (
      <div {...stylex.props(styles.results)}>
        <span
          {...stylex.props(styles.recordCount)}
        >{t`${formatNumber(displayedRecords.length)} of ${formatNumber(totalCount + liveRecords.length)}`}</span>
        <div {...stylex.props(styles.tableWrapper)}>
          <EventLogResultsTable
            records={displayedRecords}
            loading={loading}
            hasNextPage={hasNextPage}
            onLoadMore={loadMore}
            selectedTable={selectedTable}
          />
        </div>
      </div>
    );
  };

  return (
    <div {...stylex.props(styles.root)}>
      <Card.Root
        rounded
        fullWidth
        backgroundColor={themeCssVariables.background.secondary}
      >
        <div {...stylex.props(styles.cardContent)}>
          <div {...stylex.props(styles.selectorRow)}>
            <div {...stylex.props(styles.selectorGrow)}>
              <EventLogTableSelector
                value={selectedTable}
                onChange={handleTableChange}
              />
            </div>
            {canQuery && (
              <IconButton
                variant="outline"
                size="md"
                aria-label={isPaused ? t`Resume` : t`Pause`}
                onClick={() => setIsPaused((previous) => !previous)}
              >
                {isPaused ? <IconPlayerPlay /> : <IconPlayerPause />}
              </IconButton>
            )}
          </div>
          <EventLogFilters
            table={selectedTable}
            value={filters}
            onChange={handleFiltersChange}
          />
        </div>
      </Card.Root>

      {renderResults()}
    </div>
  );
};
