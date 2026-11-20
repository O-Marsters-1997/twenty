import { useLingui } from '@lingui/react/macro';
import { monospaceFont } from '@/ui/theme/constants/MonospaceFontFamily.stylex';
import { Fragment } from 'react';
import { formatBytes, isDefined } from 'twenty-shared/utils';
import { type WorkflowRunStepLog } from 'twenty-shared/workflow';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconClock,
  IconWorld,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';

import { MONOSPACE_FONT_FAMILY } from '@/ui/theme/constants/MonospaceFontFamily';
import { formatDuration } from '~/utils/format/formatDuration';
import { logStyles } from '@/workflow/workflow-steps/workflow-actions/components/workflowRunStepLogsStyles';
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
  font,
  color,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  url: {
    color: fontColor['--t-font-color-tertiary'],
    fontFamily: monospaceFont.family,
    fontSize: fontSize['--t-font-size-sm'],
    overflowWrap: 'anywhere',
  },
  headerName: {
    color: fontColor['--t-font-color-tertiary'],
    fontFamily: monospaceFont.family,
    fontSize: fontSize['--t-font-size-xs'],
  },
  headerValue: {
    color: fontColor['--t-font-color-primary'],
    fontFamily: monospaceFont.family,
    fontSize: fontSize['--t-font-size-xs'],
    overflowWrap: 'anywhere',
  },
  bodyPre: {
    background: background['--t-background-tertiary'],
    margin: 0,
    padding: spacing['--t-spacing-2'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    overflow: 'auto',
    color: fontColor['--t-font-color-primary'],
    fontFamily: monospaceFont.family,
    fontSize: fontSize['--t-font-size-sm'],
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '300px',
  },

  methodBadge: {
    background: backgroundTransparent['--t-background-transparent-light'],
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    textTransform: 'uppercase',
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-0_5'],
  },
  networkErrorBadge: {
    background: backgroundTransparent['--t-background-transparent-danger'],
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: color['--t-color-red'],
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-0_5'],
  },
  headerTable: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: `${spacing['--t-spacing-1']} ${spacing['--t-spacing-3']}`,
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
});

type HttpRequestDetails = Extract<
  WorkflowRunStepLog['details'],
  { type: 'HTTP_REQUEST' }
>;

const HeaderTable = ({ headers }: { headers: Record<string, string> }) => {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div {...stylex.props(styles.headerTable)}>
      {entries.map(([name, value]) => (
        <Fragment key={name}>
          <span {...stylex.props(styles.headerName)}>{name}</span>
          <span {...stylex.props(styles.headerValue)}>{value}</span>
        </Fragment>
      ))}
    </div>
  );
};

const BodyBlock = ({
  body,
  bodyBytes,
  bodyTruncated,
  emptyLabel,
}: {
  body: string | undefined;
  bodyBytes: number | undefined;
  bodyTruncated: boolean | undefined;
  emptyLabel: string;
}) => {
  if (!isDefined(body) || body.length === 0) {
    return <div {...stylex.props(logStyles.emptyHint)}>{emptyLabel}</div>;
  }

  return (
    <>
      <pre {...stylex.props(styles.bodyPre)}>{body}</pre>
      {(isDefined(bodyBytes) || bodyTruncated) && (
        <div {...stylex.props(logStyles.bodyMeta)}>
          {isDefined(bodyBytes) && formatBytes(bodyBytes)}
          {bodyTruncated && ' · truncated'}
        </div>
      )}
    </>
  );
};

export const WorkflowRunStepLogsHttpRequestDetail = ({
  details,
}: {
  details: HttpRequestDetails;
}) => {
  const { t } = useLingui();
  const { request, response, durationMs, error } = details;

  const isSuccess = isDefined(response)
    ? response.status >= 200 && response.status < 400
    : false;
  const hasNetworkError = !isDefined(response);

  return (
    <>
      <div {...stylex.props(logStyles.summaryCard)}>
        <div {...stylex.props(logStyles.summaryHeader)}>
          <div {...stylex.props(logStyles.headerLeft)}>
            <IconWorld size={16} />
            <span {...stylex.props(logStyles.title)}>{t`HTTP request`}</span>
          </div>
          <div {...stylex.props(logStyles.badgeGroup)}>
            <span {...stylex.props(styles.methodBadge)}>{request.method}</span>
            {isDefined(response) ? (
              <span
                {...stylex.props(
                  logStyles.statusBadge,
                  isSuccess
                    ? logStyles.statusBadgeSuccess
                    : logStyles.statusBadgeDanger,
                )}
              >
                {response.status}
                {isDefined(response.statusText) &&
                response.statusText.length > 0
                  ? ` ${response.statusText}`
                  : ''}
              </span>
            ) : (
              <span {...stylex.props(styles.networkErrorBadge)}>
                <IconAlertTriangle size={12} />
                {t`Network error`}
              </span>
            )}
          </div>
        </div>
        <div {...stylex.props(styles.url)}>{request.url}</div>
        <div {...stylex.props(logStyles.metricsRow)}>
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

      <section {...stylex.props(logStyles.section)}>
        <h3 {...stylex.props(logStyles.sectionTitle)}>
          <IconArrowUp size={12} />
          {t`Request`}
        </h3>
        <HeaderTable headers={request.headers} />
        <BodyBlock
          body={request.body}
          bodyBytes={request.bodyBytes}
          bodyTruncated={request.bodyTruncated}
          emptyLabel={t`No request body`}
        />
      </section>

      {isDefined(response) ? (
        <section {...stylex.props(logStyles.section)}>
          <h3 {...stylex.props(logStyles.sectionTitle)}>
            <IconArrowDown size={12} />
            {t`Response`}
          </h3>
          <HeaderTable headers={response.headers} />
          <BodyBlock
            body={response.body}
            bodyBytes={response.bodyBytes}
            bodyTruncated={response.bodyTruncated}
            emptyLabel={t`No response body`}
          />
        </section>
      ) : (
        hasNetworkError &&
        isDefined(error) && (
          <section {...stylex.props(logStyles.section)}>
            <h3 {...stylex.props(logStyles.sectionTitle)}>
              <IconAlertTriangle size={12} />
              {t`Error`}
            </h3>
            <div {...stylex.props(logStyles.errorCard)}>
              <div {...stylex.props(logStyles.errorMessageText)}>{error}</div>
            </div>
          </section>
        )
      )}
    </>
  );
};
