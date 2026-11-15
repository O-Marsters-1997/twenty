import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { FieldInputEventContext } from '@/object-record/record-field/ui/contexts/FieldInputEventContext';
import { useRegisterInputEvents } from '@/ui/input/hooks/useRegisterInputEvents';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { type FieldRichTextMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { useOpenRichTextInSidePanel } from '@/side-panel/hooks/useOpenRichTextInSidePanel';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { t } from '@lingui/core/macro';
import { Suspense, lazy, useContext, useRef } from 'react';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { IconButton } from 'twenty-ui/components/input';
import { IconLayoutSidebarLeftCollapse } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

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
    alignItems: 'flex-start',
    backgroundColor: background['--t-background-primary'],
    boxSizing: 'border-box',
    display: 'flex',
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: `calc(-1 * ${spacing['--t-spacing-5']})`,
    maxHeight: 'min(calc(60vh / var(--t-zoom, 1)), 500px)',
    overflow: 'hidden',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-12'],
    position: 'relative',
    width: '480px',
  },
  editorScroll: {
    alignSelf: 'stretch',
    flex: '1',
    minHeight: '0',
    overflowY: 'auto',
  },
  collapseButton: {
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    color: fontColor['--t-font-color-light'],
    cursor: 'pointer',
    display: 'flex',
  },
});

const LoadingSkeleton = () => {
  return (
    <SkeletonLine
      height={SKELETON_HEIGHT_SIZES.s}
      borderRadius={themeCssVariables.border.radius.md}
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

export const RichTextFieldInput = () => {
  const { fieldDefinition, recordId } = useContext(FieldContext);

  const metadata = (fieldDefinition as { metadata: FieldRichTextMetadata })
    .metadata;

  const objectNameSingular = metadata.objectMetadataNameSingular ?? '';
  const fieldName = metadata.fieldName;

  const { openRichTextInSidePanel } = useOpenRichTextInSidePanel();
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useAvailableComponentInstanceIdOrThrow(
    RecordFieldComponentInstanceContext,
  );

  const { onEscape, onClickOutside } = useContext(FieldInputEventContext);

  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    onClickOutside?.({ event, skipPersist: true });
  };

  const handleEscape = () => {
    onEscape?.({ skipPersist: true });
  };

  useRegisterInputEvents({
    focusId: instanceId,
    inputRef: containerRef,
    inputValue: null,
    onClickOutside: handleClickOutside,
    onEscape: handleEscape,
  });

  return (
    <div ref={containerRef} {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.editorScroll)}>
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
      <div {...stylex.props(styles.collapseButton)}>
        <IconButton
          elevated
          size="sm"
          onClick={() => {
            onEscape?.({ skipPersist: true });
            openRichTextInSidePanel(recordId, objectNameSingular, fieldName);
          }}
          aria-label={t`Open in side panel`}
        >
          <IconLayoutSidebarLeftCollapse />
        </IconButton>
      </div>
    </div>
  );
};
