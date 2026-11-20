import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { useLingui } from '@lingui/react/macro';
import { Fragment, type ReactNode } from 'react';
import { useInView } from 'react-intersection-observer';

import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';

import { LOG_CONSOLE_TABLE_SCROLL_WRAPPER_ID } from '@/log-console/constants/LogConsoleTableScrollWrapperId';
import { type LogConsoleSource } from '@/log-console/types/LogConsoleSource';
import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { useScrollWrapperHTMLElement } from '@/ui/utilities/scroll/hooks/useScrollWrapperHTMLElement';
import { type EventLogRecord } from '~/generated-metadata/graphql';
import { isDeeplyEqual } from '~/utils/isDeeplyEqual';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  accent,
  animationDuration,
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { logConsoleEasing, logConsoleRowMarker } from './LogConsole.stylex';

const SKELETON_ROW_COUNT = 8;

type StickyFirstCellProps = {
  isHighlightable?: boolean;
  isExpanded?: boolean;
  children: ReactNode;
};

const StickyFirstCell = ({
  isHighlightable = false,
  isExpanded = false,
  children,
}: StickyFirstCellProps) => (
  <div
    {...stylex.props(
      styles.stickyFirstCell,
      isHighlightable && styles.stickyFirstCellHighlightable,
      isExpanded && styles.stickyFirstCellExpanded,
    )}
  >
    {children}
  </div>
);

type LogConsoleTableProps = {
  source: LogConsoleSource;
  entries: EventLogRecord[];
  liveEntryCount: number;
  loading: boolean;
  hasNextPage: boolean;
  selectedEntry?: EventLogRecord;
  onLoadMore: () => void;
  onEntryClick: (entry: EventLogRecord) => void;
};

export const LogConsoleTable = ({
  source,
  entries,
  liveEntryCount,
  loading,
  hasNextPage,
  selectedEntry,
  onLoadMore,
  onEntryClick,
}: LogConsoleTableProps) => {
  const { t } = useLingui();

  const { scrollWrapperHTMLElement } = useScrollWrapperHTMLElement(
    LOG_CONSOLE_TABLE_SCROLL_WRAPPER_ID,
  );

  const { ref: loadMoreTriggerRef } = useInView({
    root: scrollWrapperHTMLElement,
    rootMargin: '400px',
    onChange: (inView) => {
      if (inView) {
        onLoadMore();
      }
    },
  });

  const columns = source.columns;

  const gridTemplateColumns = columns
    .map((column) => column.gridTrack)
    .join(' ');

  const isInitialLoading = loading && entries.length === 0;

  const isLoadingNextPage = loading && hasNextPage;

  const storedEntryCount = entries.length - liveEntryCount;

  const renderEntryRow = (
    entry: EventLogRecord,
    key: number,
    isLiveEntry: boolean,
  ) => {
    const isExpanded =
      isDefined(selectedEntry) && isDeeplyEqual(entry, selectedEntry);

    return (
      <TableRow
        key={key}
        className={
          stylex.props(logConsoleRowMarker, isLiveEntry && styles.liveEntryRow)
            .className
        }
        gridTemplateColumns={gridTemplateColumns}
        height={themeCssVariables.spacing[8]}
        isClickable
        isExpanded={isExpanded}
        onClick={() => onEntryClick(entry)}
      >
        {columns.map((column, columnIndex) => (
          <Fragment key={column.id}>
            {columnIndex === 0 ? (
              <StickyFirstCell isHighlightable isExpanded={isExpanded}>
                {column.renderCell(entry)}
              </StickyFirstCell>
            ) : (
              column.renderCell(entry)
            )}
          </Fragment>
        ))}
      </TableRow>
    );
  };

  return (
    <ScrollWrapper componentInstanceId={LOG_CONSOLE_TABLE_SCROLL_WRAPPER_ID}>
      <Table className={stylex.props(styles.table).className}>
        <TableRow
          className={stylex.props(styles.headerRow).className}
          gridTemplateColumns={gridTemplateColumns}
          hoverBackgroundColor={themeCssVariables.background.primary}
        >
          {columns.map((column, columnIndex) => {
            const header = (
              <TableHeader key={column.id} align={column.align}>
                {t(column.label)}
              </TableHeader>
            );

            return columnIndex === 0 ? (
              <StickyFirstCell key={column.id}>{header}</StickyFirstCell>
            ) : (
              header
            );
          })}
        </TableRow>
        {entries.map((entry, entryIndex) =>
          renderEntryRow(
            entry,
            liveEntryCount - entryIndex,
            entryIndex < liveEntryCount,
          ),
        )}
        {hasNextPage && (
          <div
            key={storedEntryCount}
            ref={loadMoreTriggerRef}
            {...stylex.props(styles.loadMoreTrigger)}
          />
        )}
        {(isInitialLoading || isLoadingNextPage) && (
          <>
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
              <TableRow
                key={`skel-${rowIndex}`}
                gridTemplateColumns={gridTemplateColumns}
              >
                {columns.map((column, columnIndex) => {
                  const cell = (
                    <TableCell key={column.id}>
                      <SkeletonLine width={80} height={16} />
                    </TableCell>
                  );

                  return columnIndex === 0 ? (
                    <StickyFirstCell key={column.id}>{cell}</StickyFirstCell>
                  ) : (
                    cell
                  );
                })}
              </TableRow>
            ))}
          </>
        )}
      </Table>
    </ScrollWrapper>
  );
};

const liveEntryEntrance = stylex.keyframes({
  from: { opacity: 0, height: 0 },
});

const liveEntryHighlight = stylex.keyframes({
  from: { backgroundColor: accent['--t-accent-quaternary'] },
});

const styles = stylex.create({
  table: {
    paddingInline: spacing['--t-spacing-3'],
    boxSizing: 'border-box',
    minWidth: 'min-content',
  },
  headerRow: {
    borderRadius: 0,
    backgroundColor: background['--t-background-primary'],
    boxShadow: `inset 0 -1px 0 ${borderColor['--t-border-color-light']}`,
    position: 'sticky',
    zIndex: 2,
    top: 0,
  },
  liveEntryRow: {
    overflow: 'hidden',
    animationDuration: {
      default: `calc(${animationDuration['--t-animation-duration-normal']} * 1s), calc(${animationDuration['--t-animation-duration-slow']} * 1s)`,
      [media.reducedMotion]: null,
    },
    animationName: {
      default: `${liveEntryEntrance}, ${liveEntryHighlight}`,
      [media.reducedMotion]: 'none',
    },
    animationTimingFunction: `${logConsoleEasing.standard}, ease-out`,
  },
  stickyFirstCell: {
    backgroundColor: background['--t-background-primary'],
    position: 'sticky',
    zIndex: 1,
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: 0,
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: 0,
    left: 0,
  },
  stickyFirstCellHighlightable: {
    boxShadow: {
      default: null,
      [stylex.when.ancestor(':hover', logConsoleRowMarker)]:
        `inset 0 0 0 100vmax ${backgroundTransparent['--t-background-transparent-light']}`,
    },
  },
  stickyFirstCellExpanded: {
    boxShadow: `inset 0 0 0 100vmax ${backgroundTransparent['--t-background-transparent-light']}`,
  },
  loadMoreTrigger: {
    height: '1px',
  },
});
