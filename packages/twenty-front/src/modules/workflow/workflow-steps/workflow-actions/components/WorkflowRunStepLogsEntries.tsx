import { useLingui } from '@lingui/react/macro';
import { monospaceFont } from '@/ui/theme/constants/MonospaceFontFamily.stylex';
import { type WorkflowRunStepLog } from 'twenty-shared/workflow';
import { themeCssVariables } from 'twenty-ui/theme';

import { MONOSPACE_FONT_FAMILY } from '@/ui/theme/constants/MonospaceFontFamily';
import { logStyles } from '@/workflow/workflow-steps/workflow-actions/components/workflowRunStepLogsStyles';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  background,
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  color,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  entriesList: {
    background: background['--t-background-tertiary'],
    padding: spacing['--t-spacing-2'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: monospaceFont.family,
    fontSize: fontSize['--t-font-size-sm'],
    maxHeight: '300px',
    overflowY: 'auto',
  },
  levelBadge: {
    borderRadius: borderRadius['--t-border-radius-xs'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-1'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    textTransform: 'uppercase',
  },
  levelError: {
    background: backgroundTransparent['--t-background-transparent-danger'],
    color: color['--t-color-red'],
  },
  levelWarn: {
    background: backgroundTransparent['--t-background-transparent-orange'],
    color: color['--t-color-orange'],
  },
  levelInfo: {
    background: backgroundTransparent['--t-background-transparent-blue'],
    color: color['--t-color-blue'],
  },
  levelDefault: {
    background: backgroundTransparent['--t-background-transparent-light'],
    color: fontColor['--t-font-color-tertiary'],
  },

  entryRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'baseline',
    color: fontColor['--t-font-color-primary'],
    display: 'grid',
    gridTemplateColumns: 'max-content max-content 1fr',
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: spacing['--t-spacing-0_5'],
  },
  timestamp: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
  },
  message: {
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
});

const levelStyles: Record<string, stylex.StyleXStyles> = {
  error: styles.levelError,
  warn: styles.levelWarn,
  info: styles.levelInfo,
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleTimeString();
};

export const WorkflowRunStepLogsEntries = ({
  entries,
  onlyLatestIteration = false,
}: {
  entries: WorkflowRunStepLog['entries'];
  onlyLatestIteration?: boolean;
}) => {
  const { t } = useLingui();

  if (entries.length === 0) {
    return null;
  }

  const sectionTitle = onlyLatestIteration
    ? t`Entries (${entries.length}, latest iteration only)`
    : t`Entries (${entries.length})`;

  return (
    <section {...stylex.props(logStyles.section)}>
      <h3 {...stylex.props(logStyles.sectionTitle)}>{sectionTitle}</h3>
      <div {...stylex.props(styles.entriesList)}>
        {entries.map((entry, index) => (
          <div
            key={`${entry.timestamp}-${index}`}
            {...stylex.props(styles.entryRow)}
          >
            <span {...stylex.props(styles.timestamp)}>
              {formatTimestamp(entry.timestamp)}
            </span>
            <span
              {...stylex.props(
                styles.levelBadge,
                levelStyles[entry.level] ?? styles.levelDefault,
              )}
            >
              {entry.level}
            </span>
            <span {...stylex.props(styles.message)}>{entry.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
