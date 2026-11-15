import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

import { LinkifiedText } from '@/ui/field/display/components/LinkifiedText/LinkifiedText';
import { getActivitySummary } from '@/activities/utils/getActivitySummary';
import { beautifyExactDate, hasDatePassed } from '~/utils/date-utils';

import { ActivityRow } from '@/activities/components/ActivityRow';
import { useActivityFieldComponentInstanceId } from '@/activities/hooks/useActivityFieldComponentInstanceId';
import { useCompleteTask } from '@/activities/tasks/hooks/useCompleteTask';
import { type Task } from '@/activities/types/Task';
import { StopPropagationContainer } from '@/object-record/record-board/record-board-card/components/StopPropagationContainer';
import { FieldContextProvider } from '@/object-record/record-field/ui/components/FieldContextProvider';
import { useObjectMorphJunctionConfigOrThrow } from '@/object-record/record-field/ui/hooks/useObjectMorphJunctionConfigOrThrow';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { RecordInlineCell } from '@/object-record/record-inline-cell/components/RecordInlineCell';
import { getRecordFieldInputInstanceId } from '@/object-record/utils/getRecordFieldInputId';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconCalendar } from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  taskTitle: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflow: 'hidden',
    paddingBottom: '1px',
    paddingInline: spacing['--t-spacing-2'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  taskTitleCompleted: {
    textDecoration: 'line-through',
  },
  dueDate: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    paddingInlineStart: spacing['--t-spacing-1'],
    whiteSpace: 'nowrap',
  },
  dueDatePast: {
    color: fontColor['--t-font-color-danger'],
  },
  leftSideContainer: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    overflow: 'hidden',
  },
  taskBody: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    maxWidth: `calc(80% - ${spacing['--t-spacing-2']})`,
    overflow: 'hidden',
    paddingBottom: '1px',
    position: 'relative',
    textOverflow: 'ellipsis',
    zIndex: '1',
  },
  rightSideContainer: {
    alignItems: 'center',
    display: 'inline-flex',
    maxWidth: '50%',
  },
  activityTargetsContainer: {
    overflow: 'clip',
    position: 'relative',
    width: '100%',
    zIndex: '1',
  },
  placeholder: {
    color: fontColor['--t-font-color-light'],
  },
  checkboxContainer: {
    display: 'flex',
    position: 'relative',
    zIndex: '1',
  },
});

export const TaskRow = ({ task }: { task: Task }) => {
  const theme = useTheme();
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const body = getActivitySummary(task?.bodyV2?.blocknote ?? null);

  const { completeTask } = useCompleteTask(task);

  const junctionFieldName = useObjectMorphJunctionConfigOrThrow({
    objectNameSingular: CoreObjectNameSingular.Task,
  }).junctionField.name;

  const instanceIdPrefix =
    useActivityFieldComponentInstanceId('task-row-targets');
  const componentInstanceId = getRecordFieldInputInstanceId({
    recordId: task.id,
    fieldName: junctionFieldName,
    prefix: instanceIdPrefix,
  });

  return (
    <ActivityRow
      label={isNonEmptyString(task.title) ? task.title : t`Task title`}
      onClick={() => {
        openRecordInSidePanel({
          recordId: task.id,
          objectNameSingular: CoreObjectNameSingular.Task,
        });
      }}
    >
      <div {...stylex.props(styles.leftSideContainer)}>
        <div
          onClick={(e) => {
            e.stopPropagation();
          }} {...stylex.props(styles.checkboxContainer)}
        >
          <Checkbox
            checked={task.status === 'DONE'}
            shape={'round'}
            onCheckedChange={completeTask}
          />
        </div>
        <div
          {...stylex.props(
            styles.taskTitle,
            task.status === 'DONE' && styles.taskTitleCompleted,
          )}
        >
          {task.title || <div {...stylex.props(styles.placeholder)}>{t`Task title`}</div>}
        </div>
        <div {...stylex.props(styles.taskBody)}>
          <OverflowingTextWithTooltip
            text={<LinkifiedText text={body} />}
            tooltipContent={body}
          />
        </div>
      </div>
      <div {...stylex.props(styles.rightSideContainer)}>
        {task.dueAt && (
          <div
            {...stylex.props(
              styles.dueDate,
              hasDatePassed(task.dueAt) &&
                task.status === 'TODO' &&
                styles.dueDatePast,
            )}
          >
            <IconCalendar size={theme.icon.size.md} />
            {beautifyExactDate(task.dueAt)}
          </div>
        )}
        {
          <div {...stylex.props(styles.activityTargetsContainer)}>
            <FieldContextProvider
              objectNameSingular={CoreObjectNameSingular.Task}
              objectRecordId={task.id}
              fieldMetadataName={junctionFieldName}
              fieldPosition={0}
              showLabel={false}
              maxWidth={200}
              isDisplayModeFixHeight
            >
              <StopPropagationContainer>
                <RecordFieldComponentInstanceContext.Provider
                  value={{ instanceId: componentInstanceId }}
                >
                  <RecordInlineCell instanceIdPrefix={instanceIdPrefix} />
                </RecordFieldComponentInstanceContext.Provider>
              </StopPropagationContainer>
            </FieldContextProvider>
          </div>
        }
      </div>
    </ActivityRow>
  );
};
