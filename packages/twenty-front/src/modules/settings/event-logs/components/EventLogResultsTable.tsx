import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SettingsEmptyPlaceholder } from '@/settings/components/SettingsEmptyPlaceholder';
import { Trans, useLingui } from '@lingui/react/macro';
import { useCallback, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { useScrollWrapperHTMLElement } from '@/ui/utilities/scroll/hooks/useScrollWrapperHTMLElement';

import {
  type EventLogRecord,
  type EventLogTable,
} from '~/generated-metadata/graphql';

import {
  type ColumnConfig,
  getColumnsForEventLogTable,
} from '@/settings/event-logs/utils/getColumnsForEventLogTable';
import * as stylex from '@stylexjs/stylex';
import { color, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type EventLogResultsTableProps = {
  records: EventLogRecord[];
  loading: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  selectedTable: EventLogTable;
};

const styles = stylex.create({
  scrollWrapperContainer: {
    height: '100%',
    overflow: 'hidden',
  },
  loadingMore: {
    color: fontColor['--t-font-color-tertiary'],
    padding: spacing['--t-spacing-4'],
    textAlign: 'center',
  },
  intersectionObserver: {
    height: '1px',
  },
  table: {
    minWidth: '100%',
  },
  resizableHeader: {
    position: 'relative',
    userSelect: 'auto',
  },
  resizableHeaderResizing: {
    userSelect: 'none',
  },
  resizeHandle: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--t-color-blue'],
    },
    bottom: 0,
    cursor: 'col-resize',
    position: 'absolute',
    right: 0,
    top: 0,
    width: '4px',
  },
  resizeHandleResizing: {
    backgroundColor: color['--t-color-blue'],
  },
});

const EVENT_LOG_SCROLL_WRAPPER_INSTANCE_ID = 'event-log-results-table';

const buildGridTemplateColumns = (
  columns: ColumnConfig[],
  widths: Record<string, number>,
): string => {
  return columns
    .map((col, index) => {
      const isLastColumn = index === columns.length - 1;
      const width = widths[col.id] ?? col.defaultWidth;

      // oxlint-disable-next-line lingui/no-unlocalized-strings
      return isLastColumn ? `minmax(${width}px, 1fr)` : `${width}px`;
    })
    .join(' ');
};

export const EventLogResultsTable = ({
  records,
  loading,
  hasNextPage,
  onLoadMore,
  selectedTable,
}: EventLogResultsTableProps) => {
  const { t } = useLingui();

  const baseColumns = getColumnsForEventLogTable(selectedTable);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(baseColumns.map((col) => [col.id, col.defaultWidth])),
  );

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  useEffect(() => {
    setColumnWidths(
      Object.fromEntries(baseColumns.map((col) => [col.id, col.defaultWidth])),
    );
  }, [selectedTable, baseColumns]);

  const handleResizeStart = useCallback(
    (columnId: string, event: React.PointerEvent) => {
      event.preventDefault();
      setResizingColumn(columnId);
      const startX = event.clientX;
      const column = baseColumns.find((col) => col.id === columnId);
      const startWidth = columnWidths[columnId] ?? column?.defaultWidth ?? 100;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(column?.minWidth ?? 50, startWidth + delta);

        setColumnWidths((prev) => ({ ...prev, [columnId]: newWidth }));
      };

      const handlePointerUp = () => {
        setResizingColumn(null);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    },
    [columnWidths, baseColumns],
  );

  const gridTemplateColumns = buildGridTemplateColumns(
    baseColumns,
    columnWidths,
  );

  const { scrollWrapperHTMLElement } = useScrollWrapperHTMLElement(
    EVENT_LOG_SCROLL_WRAPPER_INSTANCE_ID,
  );

  const [shouldFetchMore, setShouldFetchMore] = useState(false);

  const { ref: fetchMoreRef, inView } = useInView({
    root: scrollWrapperHTMLElement,
    rootMargin: '400px',
  });

  useEffect(() => {
    if (inView && hasNextPage && !loading && !shouldFetchMore) {
      setShouldFetchMore(true);
      onLoadMore();
    }
  }, [inView, hasNextPage, loading, shouldFetchMore, onLoadMore]);

  useEffect(() => {
    if (!loading) {
      setShouldFetchMore(false);
    }
  }, [loading]);

  const isInitialLoading = loading && records.length === 0;

  if (isInitialLoading) {
    return (
      <div {...stylex.props(styles.scrollWrapperContainer)}>
        <ScrollWrapper
          componentInstanceId={EVENT_LOG_SCROLL_WRAPPER_INSTANCE_ID}
        >
          <div>
            <Table {...stylex.props(styles.table)}>
              <TableRow gridTemplateColumns={gridTemplateColumns}>
                {baseColumns.map((column) => (
                  <TableHeader key={column.id}>{t(column.label)}</TableHeader>
                ))}
              </TableRow>
              <TableRow gridTemplateColumns={gridTemplateColumns}>
                {baseColumns.map((column, index) => (
                  <TableCell key={column.id}>
                    {index === 0 && <SkeletonLine width={120} height={16} />}
                  </TableCell>
                ))}
              </TableRow>
            </Table>
          </div>
        </ScrollWrapper>
      </div>
    );
  }

  if (!loading && records.length === 0) {
    return (
      <SettingsEmptyPlaceholder>
        <Trans>No event logs found</Trans>
      </SettingsEmptyPlaceholder>
    );
  }

  return (
    <div {...stylex.props(styles.scrollWrapperContainer)}>
      <ScrollWrapper componentInstanceId={EVENT_LOG_SCROLL_WRAPPER_INSTANCE_ID}>
        <div>
          <Table {...stylex.props(styles.table)}>
            <TableRow gridTemplateColumns={gridTemplateColumns}>
              {baseColumns.map((column) => (
                <div
                  key={column.id}
                  {...stylex.props(
                    styles.resizableHeader,
                    resizingColumn === column.id &&
                      styles.resizableHeaderResizing,
                  )}
                >
                  <TableHeader>{t(column.label)}</TableHeader>
                  <div
                    onPointerDown={(event) =>
                      handleResizeStart(column.id, event)
                    }
                    {...stylex.props(
                      styles.resizeHandle,
                      resizingColumn === column.id &&
                        styles.resizeHandleResizing,
                    )}
                  />
                </div>
              ))}
            </TableRow>
            {records.map((record) => (
              <TableRow
                key={`${record.timestamp}-${record.event}`}
                gridTemplateColumns={gridTemplateColumns}
              >
                {baseColumns.map((column) => (
                  <TableCell
                    key={column.id}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {column.renderCell(record)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </Table>
        </div>
        <div
          ref={fetchMoreRef}
          {...stylex.props(styles.intersectionObserver)}
        />
        {loading && records.length > 0 && (
          <div {...stylex.props(styles.loadingMore)}>
            <Trans>Loading more...</Trans>
          </div>
        )}
      </ScrollWrapper>
    </div>
  );
};
