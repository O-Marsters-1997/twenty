import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { formatBytes, isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { type WorkflowRunStepLog } from 'twenty-shared/workflow';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconMail,
  IconPaperclip,
} from 'twenty-ui/icon';

import { formatDuration } from '~/utils/format/formatDuration';
import { logStyles } from '@/workflow/workflow-steps/workflow-actions/components/workflowRunStepLogs.stylex';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  modeBadge: {
    background: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    paddingTop: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    textTransform: 'uppercase',
  },
  subject: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflowWrap: 'anywhere',
  },
  recipientsCard: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    display: 'grid',
    gap: `${spacing['--t-spacing-1']} ${spacing['--t-spacing-3']}`,
    gridTemplateColumns: 'max-content 1fr',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  recipientLabel: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    textTransform: 'uppercase',
  },
  recipientValue: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    overflowWrap: 'anywhere',
  },
  bodyContainer: {
    background: background['--t-background-tertiary'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    maxHeight: '300px',
    overflow: 'auto',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    wordBreak: 'break-word',
  },
  bodyPre: {
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
});

type EmailDetails = Extract<WorkflowRunStepLog['details'], { type: 'EMAIL' }>;

export const WorkflowRunStepLogsEmailDetail = ({
  details,
}: {
  details: EmailDetails;
}) => {
  const { t } = useLingui();
  const isSuccess = details.status === 'SUCCESS';
  const StatusIcon = isSuccess ? IconCheck : IconAlertTriangle;
  const titleText = details.mode === 'SEND' ? t`Send email` : t`Draft email`;
  const statusLabel = isSuccess
    ? details.mode === 'SEND'
      ? t`Sent`
      : t`Drafted`
    : t`Failed`;

  return (
    <>
      <div {...stylex.props(logStyles.summaryCard)}>
        <div {...stylex.props(logStyles.summaryHeader)}>
          <div {...stylex.props(logStyles.headerLeft)}>
            <IconMail size={16} />
            <span {...stylex.props(logStyles.title)}>{titleText}</span>
          </div>
          <div {...stylex.props(logStyles.badgeGroup)}>
            <span {...stylex.props(styles.modeBadge)}>{details.mode}</span>
            <span
              {...stylex.props(
                logStyles.statusBadge,
                isSuccess
                  ? logStyles.statusBadgeSuccess
                  : logStyles.statusBadgeDanger,
              )}
            >
              <StatusIcon size={12} />
              {statusLabel}
            </span>
          </div>
        </div>

        {isDefined(details.subject) && details.subject.length > 0 && (
          <div {...stylex.props(styles.subject)}>{details.subject}</div>
        )}

        <div {...stylex.props(logStyles.metricsRow)}>
          <div {...stylex.props(logStyles.metric)}>
            <div {...stylex.props(logStyles.metricLabel)}>
              <IconClock size={12} />
              {t`Duration`}
            </div>
            <div {...stylex.props(logStyles.metricValue)}>
              {formatDuration(details.durationMs)}
            </div>
          </div>
          {isDefined(details.attachmentCount) &&
            details.attachmentCount > 0 && (
              <div {...stylex.props(logStyles.metric)}>
                <div {...stylex.props(logStyles.metricLabel)}>
                  <IconPaperclip size={12} />
                  {t`Attachments`}
                </div>
                <div {...stylex.props(logStyles.metricValue)}>
                  {details.attachmentCount}
                </div>
              </div>
            )}
        </div>
      </div>

      <section {...stylex.props(logStyles.section)}>
        <h3 {...stylex.props(logStyles.sectionTitle)}>{t`Recipients`}</h3>
        <div {...stylex.props(styles.recipientsCard)}>
          {isNonEmptyString(details.fromHandle) && (
            <>
              <span {...stylex.props(styles.recipientLabel)}>{t`From`}</span>
              <span {...stylex.props(styles.recipientValue)}>
                {details.fromHandle}
              </span>
            </>
          )}
          <span {...stylex.props(styles.recipientLabel)}>{t`To`}</span>
          <span {...stylex.props(styles.recipientValue)}>
            {isNonEmptyArray(details.recipients.to)
              ? details.recipients.to.join(', ')
              : t`—`}
          </span>
          {isNonEmptyArray(details.recipients.cc) && (
            <>
              <span {...stylex.props(styles.recipientLabel)}>{t`Cc`}</span>
              <span {...stylex.props(styles.recipientValue)}>
                {details.recipients.cc.join(', ')}
              </span>
            </>
          )}
          {isNonEmptyArray(details.recipients.bcc) && (
            <>
              <span {...stylex.props(styles.recipientLabel)}>{t`Bcc`}</span>
              <span {...stylex.props(styles.recipientValue)}>
                {details.recipients.bcc.join(', ')}
              </span>
            </>
          )}
        </div>
      </section>

      <section {...stylex.props(logStyles.section)}>
        <h3 {...stylex.props(logStyles.sectionTitle)}>{t`Body`}</h3>
        {isDefined(details.bodyPreview) && details.bodyPreview.length > 0 ? (
          <>
            <div {...stylex.props(styles.bodyContainer)}>
              <pre {...stylex.props(styles.bodyPre)}>{details.bodyPreview}</pre>
            </div>
            {(isDefined(details.bodyBytes) || details.bodyTruncated) && (
              <div {...stylex.props(logStyles.bodyMeta)}>
                {isDefined(details.bodyBytes) && formatBytes(details.bodyBytes)}
                {details.bodyTruncated && ' · truncated'}
              </div>
            )}
          </>
        ) : (
          <div {...stylex.props(logStyles.emptyHint)}>{t`No body`}</div>
        )}
      </section>

      {!isSuccess && isDefined(details.error) && (
        <section {...stylex.props(logStyles.section)}>
          <h3 {...stylex.props(logStyles.sectionTitle)}>{t`Error`}</h3>
          <div {...stylex.props(logStyles.errorCard)}>
            <div {...stylex.props(logStyles.errorMessageText)}>
              {details.error}
            </div>
          </div>
        </section>
      )}
    </>
  );
};
