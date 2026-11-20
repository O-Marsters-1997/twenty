import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { InputHint } from '@/ui/input/components/internal/InputHint/InputHint';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import type { WorkflowCronTrigger } from '@/workflow/types/Workflow';
import { calculateNextExecutionsForMinuteInterval } from '~/utils/cron-to-human/utils/calculateNextExecutionsForMinuteInterval';
import { convertScheduleToCronExpression } from '@/workflow/workflow-trigger/utils/convertScheduleToCronExpression';
import { normalizeCronExpression } from '~/utils/cron-to-human/utils/normalizeCronExpression';
import { getTriggerScheduleDescription } from '@/workflow/workflow-trigger/utils/getTriggerScheduleDescription';
import { t } from '@lingui/core/macro';
import { CronExpressionParser } from 'cron-parser';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import { formatDateTimeString } from '@/object-record/record-field/ui/utils/formatDateTimeString';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

const getNextExecutions = (
  cronExpression: string,
  trigger?: WorkflowCronTrigger,
): Date[] => {
  try {
    const normalized = normalizeCronExpression(cronExpression);

    /* For MINUTES type with interval > 30, calculate manually
     because cron's N pattern resets at hour boundaries and doesn't
     represent true continuous intervals for values > 30
     */
    if (
      trigger?.settings.type === 'MINUTES' &&
      trigger.settings.schedule.minute > 30
    ) {
      return calculateNextExecutionsForMinuteInterval(
        trigger.settings.schedule.minute,
      );
    }

    const interval = CronExpressionParser.parse(normalized, {
      tz: 'UTC',
    });
    return interval.take(3).map((date) => date.toDate());
  } catch {
    return [];
  }
};

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
    marginTop: spacing['--t-spacing-2'],
  },
  section: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-1'],
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-3'],
  },
  scheduleDescription: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  scheduleTitle: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginBottom: spacing['--t-spacing-1'],
  },
  executionItem: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginTop: spacing['--t-spacing-0_5'],
  },
});

type CronExpressionHelperProps = {
  trigger: WorkflowCronTrigger;
  isVisible?: boolean;
  isScheduleVisible?: boolean;
  isUpcomingExecutionVisible?: boolean;
};

export const CronExpressionHelper = ({
  trigger,
  isVisible = true,
  isScheduleVisible = true,
  isUpcomingExecutionVisible = true,
}: CronExpressionHelperProps) => {
  const { timeZone, dateFormat, timeFormat } = useDateTimeFormat();
  const dateLocale = useAtomStateValue(dateLocaleState);

  if (!isVisible) {
    return null;
  }

  const cronExpression = convertScheduleToCronExpression(trigger);
  const customDescription = getTriggerScheduleDescription(
    trigger,
    dateLocale.localeCatalog,
  );

  if (!cronExpression) {
    return null;
  }

  let isValid = true;
  let errorMessage = '';

  try {
    const normalized = normalizeCronExpression(cronExpression);
    CronExpressionParser.parse(normalized);
  } catch (error) {
    isValid = false;
    errorMessage = error instanceof Error ? error.message : t`Unknown error`;
  }

  if (!isValid) {
    return (
      <div {...stylex.props(styles.container)}>
        <InputHint danger>
          {errorMessage || t`Please check your cron expression syntax.`}
        </InputHint>
      </div>
    );
  }

  const nextExecutions = getNextExecutions(cronExpression, trigger);

  return (
    <div {...stylex.props(styles.container)}>
      {isScheduleVisible && (
        <div {...stylex.props(styles.section)}>
          <div {...stylex.props(styles.scheduleTitle)}>{t`Schedule`}</div>
          <div {...stylex.props(styles.scheduleDescription)}>
            {customDescription}
          </div>
        </div>
      )}
      {nextExecutions.length > 0 && isUpcomingExecutionVisible && (
        <div {...stylex.props(styles.section)}>
          <div
            {...stylex.props(styles.scheduleTitle)}
          >{t`Upcoming execution time (${timeZone})`}</div>
          {nextExecutions.slice(0, 3).map((execution, index) => (
            <div key={index} {...stylex.props(styles.executionItem)}>
              {formatDateTimeString({
                value: execution.toISOString(),
                timeZone,
                dateFormat,
                timeFormat,
                localeCatalog: dateLocale.localeCatalog,
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
