import { RecordList } from '@/object-record/record-list/components/RecordList';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  listContainer: {
    flex: '1',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0',
  },
});

export const RecordListWidget = () => {
  return (
    <div {...stylex.props(styles.listContainer)}>
      <RecordList />
    </div>
  );
};
