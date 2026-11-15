import { t } from '@lingui/core/macro';

import { useActivityFieldComponentInstanceId } from '@/activities/hooks/useActivityFieldComponentInstanceId';
import { type Note } from '@/activities/types/Note';
import { getActivityPreview } from '@/activities/utils/getActivityPreview';
import { useObjectMorphJunctionConfigOrThrow } from '@/object-record/record-field/ui/hooks/useObjectMorphJunctionConfigOrThrow';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { FieldContextProvider } from '@/object-record/record-field/ui/components/FieldContextProvider';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { RecordInlineCell } from '@/object-record/record-inline-cell/components/RecordInlineCell';
import { getRecordFieldInputInstanceId } from '@/object-record/utils/getRecordFieldInputId';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor, borderRadius, fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  card: {
    alignItems: 'flex-start',
    background: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    flexDirection: 'column',
    height: '300px',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardDetailsContainer: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    height: 'calc(100% - 45px)',
    justifyContent: 'start',
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    width: `calc(100% - ${spacing['--t-spacing-8']})`,
  },
  noteTitle: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  cardContent: {
    alignSelf: 'stretch',
    color: fontColor['--t-font-color-secondary'],
    lineBreak: 'anywhere',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'pre-line',
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: borderColor['--t-border-color-light'],
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    width: `calc(100% - ${spacing['--t-spacing-4']})`,
  },
});

export const NoteTile = ({
  note,
  isSingleNote,
}: {
  note: Note;
  isSingleNote: boolean;
}) => {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const body = getActivityPreview(note?.bodyV2?.blocknote ?? null);

  const junctionFieldName = useObjectMorphJunctionConfigOrThrow({
    objectNameSingular: CoreObjectNameSingular.Note,
  }).junctionField.name;

  const instanceIdPrefix =
    useActivityFieldComponentInstanceId('note-card-targets');
  const componentInstanceId = getRecordFieldInputInstanceId({
    recordId: note.id,
    fieldName: junctionFieldName,
    prefix: instanceIdPrefix,
  });

  return (
    <div isSingleNote={isSingleNote} {...stylex.props(styles.card)}>
      <div
        onClick={() =>
          openRecordInSidePanel({
            recordId: note.id,
            objectNameSingular: CoreObjectNameSingular.Note,
          })
        } {...stylex.props(styles.cardDetailsContainer)}
      >
        <div {...stylex.props(styles.noteTitle)}>{note.title ?? t`Task Title`}</div>
        <div {...stylex.props(styles.cardContent)}>{body}</div>
      </div>
      <div {...stylex.props(styles.footer)}>
        <FieldContextProvider
          objectNameSingular={CoreObjectNameSingular.Note}
          objectRecordId={note.id}
          fieldMetadataName={junctionFieldName}
          fieldPosition={0}
          isDisplayModeFixHeight
        >
          <RecordFieldComponentInstanceContext.Provider
            value={{ instanceId: componentInstanceId }}
          >
            <RecordInlineCell instanceIdPrefix={instanceIdPrefix} />
          </RecordFieldComponentInstanceContext.Provider>
        </FieldContextProvider>
      </div>
    </div>
  );
};
