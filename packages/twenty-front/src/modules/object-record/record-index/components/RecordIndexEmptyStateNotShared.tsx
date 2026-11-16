import { type NonReadableViewFieldInfo } from '@/object-record/record-index/hooks/useHasCurrentViewNonReadableFields';
import { getNonReadableViewFieldSubTitle } from '@/object-record/record-index/utils/getNonReadableViewFieldSubTitle';
import { AnimatedPlaceholder } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/AnimatedPlaceholder';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  emptyPlaceholderOuterContainer: {
    height: '100%',
    width: '100%',
  },
});

type RecordIndexEmptyStateNotSharedProps = {
  nonReadableViewFieldInfo?: NonReadableViewFieldInfo;
};

export const RecordIndexEmptyStateNotShared = ({
  nonReadableViewFieldInfo,
}: RecordIndexEmptyStateNotSharedProps) => {
  return (
    <div {...stylex.props(styles.emptyPlaceholderOuterContainer)}>
      <EmptyState.Root>
        <AnimatedPlaceholder type="notShared" />
        <EmptyState.Content>
          <EmptyState.Title>
            {isDefined(nonReadableViewFieldInfo)
              ? t`View not shared`
              : t`Object not shared`}
          </EmptyState.Title>
          <EmptyState.Description>
            {isDefined(nonReadableViewFieldInfo)
              ? getNonReadableViewFieldSubTitle(nonReadableViewFieldInfo)
              : t`You don't have access to this object.`}
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    </div>
  );
};
