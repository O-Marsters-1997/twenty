import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { Tag } from 'twenty-ui/primitives/data-display';

import { CoreAgentModelCell } from '@/object-core/agents/components/CoreAgentModelCell';
import { type CoreAgentRun } from '@/object-core/agents/types/CoreAgentRun';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  color,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  details: {
    gap: `${spacing['--t-spacing-2']} ${spacing['--t-spacing-4']}`,
    display: 'grid',
    gridTemplateColumns: '120px minmax(0, 1fr)',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-3'],
  },
  label: {
    color: fontColor['--t-font-color-tertiary'],
  },
  tags: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexWrap: 'wrap',
  },
  text: {
    color: fontColor['--t-font-color-primary'],
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
    minWidth: '0',
  },
  error: {
    color: color['--t-color-red'],
  },
});

type CoreAgentRunDetailsProps = {
  run: CoreAgentRun;
};

export const CoreAgentRunDetails = ({ run }: CoreAgentRunDetailsProps) => (
  <div {...stylex.props(styles.details)}>
    {isNonEmptyString(run.errorMessage) && (
      <>
        <div {...stylex.props(styles.label)}>{t`Error`}</div>
        <div {...stylex.props(styles.text, styles.error)}>
          {run.errorMessage}
        </div>
      </>
    )}
    <div {...stylex.props(styles.label)}>{t`Input`}</div>
    <div {...stylex.props(styles.text)}>{run.input ?? t`No input`}</div>
    <div {...stylex.props(styles.label)}>{t`Reply`}</div>
    <div {...stylex.props(styles.text)}>{run.reply ?? t`No reply`}</div>
    {isNonEmptyArray(run.toolNames) && (
      <>
        <div {...stylex.props(styles.label)}>{t`Tools`}</div>
        <div {...stylex.props(styles.tags)}>
          {run.toolNames.map((toolName) => (
            <Tag key={toolName} color="gray">
              {toolName}
            </Tag>
          ))}
        </div>
      </>
    )}
    {isDefined(run.modelId) && (
      <>
        <div {...stylex.props(styles.label)}>{t`Model`}</div>
        <CoreAgentModelCell modelId={run.modelId} />
      </>
    )}
    {isNonEmptyString(run.threadTitle) && (
      <>
        <div {...stylex.props(styles.label)}>{t`Conversation`}</div>
        <div {...stylex.props(styles.text)}>{run.threadTitle}</div>
      </>
    )}
  </div>
);
