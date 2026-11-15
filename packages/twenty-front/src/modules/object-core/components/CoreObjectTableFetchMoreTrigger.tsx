import { useCoreObjectTableFetchMore } from '@/object-core/hooks/useCoreObjectTableFetchMore';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  fetchMoreTrigger: {
    height: '1px',
  },
});

type CoreObjectTableFetchMoreTriggerProps = {
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
};

export const CoreObjectTableFetchMoreTrigger = ({
  isFetchingNextPage,
  onFetchNextPage,
}: CoreObjectTableFetchMoreTriggerProps) => {
  const { ref } = useCoreObjectTableFetchMore({
    isFetchingNextPage,
    onFetchNextPage,
  });

  return <div ref={ref} {...stylex.props(styles.fetchMoreTrigger)} />;
};
