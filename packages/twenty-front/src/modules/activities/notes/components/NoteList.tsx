import { type Note } from '@/activities/types/Note';
import { FieldDescriptionTooltipProvider } from '@/object-record/record-field/ui/components/FieldDescriptionTooltipProvider';

import { NoteTile } from './NoteTile';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type NoteListProps = {
  notes: Note[];
};

const styles = stylex.create({
  container: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  noteContainer: {
    gap: spacing['--t-spacing-4'],
    display: 'grid',
    gridAutoRows: '1fr',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    width: '100%',
  },
});

export const NoteList = ({ notes }: NoteListProps) => {
  return (
    <>
      {notes.length > 0 && (
        <FieldDescriptionTooltipProvider>
          <div {...stylex.props(styles.container)}>
            <div {...stylex.props(styles.noteContainer)}>
              {notes.map((note) => (
                <NoteTile
                  key={note.id}
                  note={note}
                  isSingleNote={notes.length === 1}
                />
              ))}
            </div>
          </div>
        </FieldDescriptionTooltipProvider>
      )}
    </>
  );
};
