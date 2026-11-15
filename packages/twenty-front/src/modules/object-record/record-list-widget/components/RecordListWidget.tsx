import { RecordList } from '@/object-record/record-list/components/RecordList';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  listContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '0',
    overflow: 'hidden',
  },
});

export const RecordListWidget = () => {
  return (
    <div {...stylex.props(styles.listContainer)}>
      <RecordList />
    </div>
  );
};
