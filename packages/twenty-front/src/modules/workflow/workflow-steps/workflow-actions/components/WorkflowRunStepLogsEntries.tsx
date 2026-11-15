import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type WorkflowRunStepLog } from 'twenty-shared/workflow';
import { themeCssVariables } from 'twenty-ui/theme';

import { MONOSPACE_FONT_FAMILY } from '@/ui/theme/constants/MonospaceFontFamily';
import {
  StyledSection,
  StyledSectionTitle,
} from '@/workflow/workflow-steps/workflow-actions/components/workflowRunStepLogsStyles';
import * as stylex from '@stylexjs/stylex';
import { font, spacing } from 'twenty-ui/theme/tokens.stylex';

const StyledEntriesList = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  font-family: ${MONOSPACE_FONT_FAMILY};
  font-size: ${themeCssVariables.font.size.sm};
  max-height: 300px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[2]};
`;

const styles = stylex.create({
  entryRow: {
    alignItems: 'baseline',
    color: fontColor['--t-font-color-primary'],
    display: 'grid',
    gap: spacing['--t-spacing-2'],
    gridTemplateColumns: 'max-content max-content 1fr',
    paddingTop: spacing['--t-spacing-0_5'],
    paddingRight: '0',
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: '0',
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

const StyledLevelBadge = styled.span<{ level: string }>`
  background: ${({ level }) => {
    if (level === 'error')
      return themeCssVariables.background.transparent.danger;
    if (level === 'warn')
      return themeCssVariables.background.transparent.orange;
    if (level === 'info') return themeCssVariables.background.transparent.blue;
    return themeCssVariables.background.transparent.light;
  }};
  border-radius: ${themeCssVariables.border.radius.xs};
  color: ${({ level }) => {
    if (level === 'error') return themeCssVariables.color.red;
    if (level === 'warn') return themeCssVariables.color.orange;
    if (level === 'info') return themeCssVariables.color.blue;
    return themeCssVariables.font.color.tertiary;
  }};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  padding: 0 ${themeCssVariables.spacing[1]};
  text-transform: uppercase;
`;

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
    <StyledSection>
      <StyledSectionTitle>{sectionTitle}</StyledSectionTitle>
      <StyledEntriesList>
        {entries.map((entry, index) => (
          <div key={`${entry.timestamp}-${index}`} {...stylex.props(styles.entryRow)}>
            <span {...stylex.props(styles.timestamp)}>
              {formatTimestamp(entry.timestamp)}
            </span>
            <StyledLevelBadge level={entry.level}>
              {entry.level}
            </StyledLevelBadge>
            <span {...stylex.props(styles.message)}>{entry.message}</span>
          </div>
        ))}
      </StyledEntriesList>
    </StyledSection>
  );
};
