import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { viewableRichTextComponentState } from '@/side-panel/pages/rich-text-page/states/viewableRichTextComponentState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { lazy, Suspense } from 'react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const ActivityRichTextEditor = lazy(() =>
  import('@/activities/components/ActivityRichTextEditor').then((module) => ({
    default: module.ActivityRichTextEditor,
  })),
);

const RichTextFieldEditor = lazy(() =>
  import('@/object-record/record-field/ui/meta-types/input/components/RichTextFieldEditor').then(
    (module) => ({
      default: module.RichTextFieldEditor,
    }),
  ),
);

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    paddingInlineEnd: '0px',
    paddingInlineStart: '44px',
    marginBottom: spacing['--t-spacing-4'],
    marginLeft: '-8px',
    marginRight: '-8px',
    marginTop: spacing['--t-spacing-4'],
    width: '100%',
  },
});

const LoadingSkeleton = () => {
  return (
    <SkeletonLine
      borderRadius={themeCssVariables.border.radius.smRound}
      height={SKELETON_HEIGHT_SIZES.s}
    />
  );
};

const isActivityObject = (
  objectNameSingular: string,
): objectNameSingular is
  | CoreObjectNameSingular.Note
  | CoreObjectNameSingular.Task =>
  objectNameSingular === CoreObjectNameSingular.Note ||
  objectNameSingular === CoreObjectNameSingular.Task;

export const SidePanelEditRichTextPage = () => {
  const { recordId, objectNameSingular, fieldName } = useAtomStateValue(
    viewableRichTextComponentState,
  );

  return (
    <div {...stylex.props(styles.container)}>
      <Suspense fallback={<LoadingSkeleton />}>
        {isActivityObject(objectNameSingular) ? (
          <ActivityRichTextEditor
            activityId={recordId}
            activityObjectNameSingular={objectNameSingular}
          />
        ) : (
          <RichTextFieldEditor
            recordId={recordId}
            objectNameSingular={objectNameSingular}
            fieldName={fieldName}
          />
        )}
      </Suspense>
    </div>
  );
};
