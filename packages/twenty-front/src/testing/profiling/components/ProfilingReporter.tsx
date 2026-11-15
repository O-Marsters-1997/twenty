import * as stylex from '@stylexjs/stylex';
import { useMemo } from 'react';

import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { PROFILING_REPORTER_DIV_ID } from '~/testing/profiling/constants/ProfilingReporterDivId';
import { currentProfilingRunIndexState } from '~/testing/profiling/states/currentProfilingRunIndexState';
import { profilingSessionDataPointsState } from '~/testing/profiling/states/profilingSessionDataPointsState';
import { profilingSessionStatusState } from '~/testing/profiling/states/profilingSessionStatusState';
import { computeProfilingReport } from '~/testing/profiling/utils/computeProfilingReport';

const styles = stylex.create({
  table: {
    borderColor: 'black',
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  cell: {
    borderColor: 'black',
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  dataCell: {
    paddingBlock: '5px',
    paddingInline: '5px',
  },
  totalRow: {
    fontWeight: 'bold',
  },
});

const HEADERS = [
  'Run name',
  'Min',
  'Average',
  'P50',
  'P80',
  'P90',
  'P95',
  'P99',
  'Max',
  'Variance',
];

const DURATION_KEYS = [
  'min',
  'average',
  'p50',
  'p80',
  'p90',
  'p95',
  'p99',
  'max',
] as const;

type ReportCellsProps = {
  name: string;
  stats: Record<(typeof DURATION_KEYS)[number] | 'variance', number>;
};

const ReportCells = ({ name, stats }: ReportCellsProps) => (
  <>
    <td {...stylex.props(styles.cell, styles.dataCell)}>{name}</td>
    {DURATION_KEYS.map((key) => (
      <td key={key} {...stylex.props(styles.cell, styles.dataCell)}>
        {Math.round(stats[key] * 1000) / 1000}ms
      </td>
    ))}
    <td {...stylex.props(styles.cell, styles.dataCell)}>
      {Math.round(stats.variance * 1000000) / 1000000}
    </td>
  </>
);

export const ProfilingReporter = () => {
  const profilingSessionDataPoints = useAtomStateValue(
    profilingSessionDataPointsState,
  );

  const currentProfilingRunIndex = useAtomStateValue(
    currentProfilingRunIndexState,
  );

  const profilingSessionStatus = useAtomStateValue(profilingSessionStatusState);

  const profilingReport = useMemo(
    () => computeProfilingReport(profilingSessionDataPoints),
    [profilingSessionDataPoints],
  );

  return (
    <div
      data-profiling-report={JSON.stringify(profilingReport)}
      id={PROFILING_REPORTER_DIV_ID}
    >
      <h2>Profiling report</h2>
      <div>
        Run #{currentProfilingRunIndex} - Status {profilingSessionStatus}
      </div>
      <table {...stylex.props(styles.table)}>
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th key={header} {...stylex.props(styles.cell)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr {...stylex.props(styles.totalRow)}>
            <ReportCells name="Total" stats={profilingReport.total} />
          </tr>
          {Object.entries(profilingReport.runs).map(([runName, report]) => (
            <tr key={runName}>
              <ReportCells name={runName} stats={report} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
