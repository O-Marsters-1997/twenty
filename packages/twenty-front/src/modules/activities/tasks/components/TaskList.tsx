import { ActivityList } from '@/activities/components/ActivityList';
import { type Task } from '@/activities/types/Task';
import { SelectDisplay } from '@/ui/field/display/components/SelectDisplay/SelectDisplay';
import { type ThemeColor } from 'twenty-ui/theme';

import { TaskRow } from './TaskRow';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type TaskListProps = {
  title: string;
  titleColor: ThemeColor | 'transparent';
  tasks: Task[];
  isFirst: boolean;
};

const styles = stylex.create({
  titleBar: {
    placeItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: spacing['--t-spacing-3'],
    marginTop: spacing['--t-spacing-4'],
    width: '100%',
  },
  titleBarFirst: {
    marginTop: 0,
  },
  container: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    display: 'flex',
  },
  count: {
    color: fontColor['--t-font-color-light'],
    marginLeft: spacing['--t-spacing-2'],
  },
});

export const TaskList = ({
  title,
  titleColor,
  tasks,
  isFirst,
}: TaskListProps) => (
  <>
    {tasks.length > 0 && (
      <div {...stylex.props(styles.container)}>
        <div
          {...stylex.props(styles.titleBar, isFirst && styles.titleBarFirst)}
        >
          {title && (
            <span {...stylex.props(styles.title)}>
              <SelectDisplay color={titleColor} label={title} />
              <span {...stylex.props(styles.count)}>{tasks.length}</span>
            </span>
          )}
        </div>
        <ActivityList>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ActivityList>
      </div>
    )}
  </>
);
