import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { type CoreObjectNameSingular } from 'twenty-shared/types';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { lazy, Suspense } from 'react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const ActivityRichTextEditor = lazy(() =>
  import('@/activities/components/ActivityRichTextEditor').then((module) => ({
    default: module.ActivityRichTextEditor,
  })),
);

const styles = stylex.create({
  showPageActivityContainer: {
    boxSizing: 'border-box',
    marginTop: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-6'],
    paddingRight: spacing['--t-spacing-2'],
    width: '100%',
  },
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-4'],
  },
});

const LoadingSkeleton = () => {
  return (
    <div {...stylex.props(styles.skeletonContainer)}>
      <SkeletonLine
        height={SKELETON_HEIGHT_SIZES.s}
        borderRadius={themeCssVariables.border.radius.md}
      />
    </div>
  );
};

export const FieldRichTextCard = () => {
  const targetRecord = useTargetRecord();
  const activityBodyV2 = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId: targetRecord.id,
    fieldName: 'bodyV2',
  });

  const activityObjectNameSingular = targetRecord.targetObjectNameSingular as
    | CoreObjectNameSingular.Note
    | CoreObjectNameSingular.Task;

  if (!isDefined(activityBodyV2)) {
    return <LoadingSkeleton />;
  }

  return (
    <ScrollWrapper
      componentInstanceId={`scroll-wrapper-tab-list-${targetRecord.id}`}
    >
      <div {...stylex.props(styles.showPageActivityContainer)}>
        <Suspense fallback={<LoadingSkeleton />}>
          <ActivityRichTextEditor
            activityId={targetRecord.id}
            activityObjectNameSingular={activityObjectNameSingular}
          />
        </Suspense>
      </div>
    </ScrollWrapper>
  );
};
