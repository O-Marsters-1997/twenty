import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
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
import {
  StyledBadgeGroup,
  StyledBodyMeta,
  StyledEmptyHint,
  StyledErrorCard,
  StyledErrorMessageText,
  StyledHeaderLeft,
  StyledMetric,
  StyledMetricLabel,
  StyledMetricsRow,
  StyledMetricValue,
  StyledSection,
  StyledSectionTitle,
  StyledStatusBadge,
  StyledSummaryCard,
  StyledSummaryHeader,
  StyledTitle,
} from '@/workflow/workflow-steps/workflow-actions/components/workflowRunStepLogsStyles';
import * as stylex from '@stylexjs/stylex';
import { spacing, backgroundTransparent, borderColor, borderRadius, fontColor, fontSize, fontWeight, font, color } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  methodBadge: {
    background: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    paddingTop: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    textTransform: 'uppercase',
  },
  networkErrorBadge: {
    alignItems: 'center',
    background: backgroundTransparent['--t-background-transparent-danger'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    color: color['--t-color-red'],
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    gap: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  headerTable: {
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
});

const StyledUrl = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-family: ${MONOSPACE_FONT_FAMILY};
  font-size: ${themeCssVariables.font.size.sm};
  overflow-wrap: anywhere;
`;

const StyledHeaderName = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-family: ${MONOSPACE_FONT_FAMILY};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledHeaderValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-family: ${MONOSPACE_FONT_FAMILY};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
`;

const StyledBodyPre = styled.pre`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: ${MONOSPACE_FONT_FAMILY};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  max-height: 300px;
  overflow: auto;
  padding: ${themeCssVariables.spacing[2]};
  white-space: pre-wrap;
  word-break: break-word;
`;

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
          <StyledHeaderName>{name}</StyledHeaderName>
          <StyledHeaderValue>{value}</StyledHeaderValue>
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
    return <StyledEmptyHint>{emptyLabel}</StyledEmptyHint>;
  }

  return (
    <>
      <StyledBodyPre>{body}</StyledBodyPre>
      {(isDefined(bodyBytes) || bodyTruncated) && (
        <StyledBodyMeta>
          {isDefined(bodyBytes) && formatBytes(bodyBytes)}
          {bodyTruncated && ' · truncated'}
        </StyledBodyMeta>
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
      <StyledSummaryCard>
        <StyledSummaryHeader>
          <StyledHeaderLeft>
            <IconWorld size={16} />
            <StyledTitle>{t`HTTP request`}</StyledTitle>
          </StyledHeaderLeft>
          <StyledBadgeGroup>
            <span method={request.method} {...stylex.props(styles.methodBadge)}>
              {request.method}
            </span>
            {isDefined(response) ? (
              <StyledStatusBadge isSuccess={isSuccess}>
                {response.status}
                {isDefined(response.statusText) &&
                response.statusText.length > 0
                  ? ` ${response.statusText}`
                  : ''}
              </StyledStatusBadge>
            ) : (
              <span {...stylex.props(styles.networkErrorBadge)}>
                <IconAlertTriangle size={12} />
                {t`Network error`}
              </span>
            )}
          </StyledBadgeGroup>
        </StyledSummaryHeader>
        <StyledUrl>{request.url}</StyledUrl>
        <StyledMetricsRow>
          <StyledMetric>
            <StyledMetricLabel>
              <IconClock size={12} />
              {t`Duration`}
            </StyledMetricLabel>
            <StyledMetricValue>{formatDuration(durationMs)}</StyledMetricValue>
          </StyledMetric>
        </StyledMetricsRow>
      </StyledSummaryCard>

      <StyledSection>
        <StyledSectionTitle>
          <IconArrowUp size={12} />
          {t`Request`}
        </StyledSectionTitle>
        <HeaderTable headers={request.headers} />
        <BodyBlock
          body={request.body}
          bodyBytes={request.bodyBytes}
          bodyTruncated={request.bodyTruncated}
          emptyLabel={t`No request body`}
        />
      </StyledSection>

      {isDefined(response) ? (
        <StyledSection>
          <StyledSectionTitle>
            <IconArrowDown size={12} />
            {t`Response`}
          </StyledSectionTitle>
          <HeaderTable headers={response.headers} />
          <BodyBlock
            body={response.body}
            bodyBytes={response.bodyBytes}
            bodyTruncated={response.bodyTruncated}
            emptyLabel={t`No response body`}
          />
        </StyledSection>
      ) : (
        hasNetworkError &&
        isDefined(error) && (
          <StyledSection>
            <StyledSectionTitle>
              <IconAlertTriangle size={12} />
              {t`Error`}
            </StyledSectionTitle>
            <StyledErrorCard>
              <StyledErrorMessageText>{error}</StyledErrorMessageText>
            </StyledErrorCard>
          </StyledSection>
        )
      )}
    </>
  );
};
