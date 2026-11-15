import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { lazy, Suspense } from 'react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { isUndefined } from '@sniptt/guards';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

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
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  editorContainer: {
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

type FieldWidgetRichTextEditorProps = {
  fieldMetadataItem: FieldMetadataItem;
  objectMetadataItem: EnrichedObjectMetadataItem;
  recordId: string;
};

export const FieldWidgetRichTextEditor = ({
  fieldMetadataItem,
  objectMetadataItem,
  recordId,
}: FieldWidgetRichTextEditorProps) => {
  const objectNameSingular = objectMetadataItem.nameSingular;
  const fieldName = fieldMetadataItem.name;

  const fieldValue = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId,
    fieldName,
  });

  if (isUndefined(fieldValue)) {
    return <LoadingSkeleton />;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <ScrollWrapper
        componentInstanceId={`scroll-wrapper-field-widget-rich-text-${recordId}-${fieldName}`}
      >
        <div {...stylex.props(styles.editorContainer)}>
          <Suspense fallback={<LoadingSkeleton />}>
            <RichTextFieldEditor
              recordId={recordId}
              objectNameSingular={objectNameSingular}
              fieldName={fieldName}
            />
          </Suspense>
        </div>
      </ScrollWrapper>
    </div>
  );
};
