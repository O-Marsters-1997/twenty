import { CustomResolverFetchMoreLoader } from '@/activities/components/CustomResolverFetchMoreLoader';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { NoteList } from '@/activities/notes/components/NoteList';
import { type Note } from '@/activities/types/Note';
import { AnimatedPlaceholder } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/AnimatedPlaceholder';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  notesContainer: {
    flex: '1',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
});

type NotesCardContentProps = {
  loading: boolean;
  notes: Note[];
  onCreateNote: (() => void) | undefined;
  onLastRowVisible: () => Promise<void>;
};

export const NotesCardContent = ({
  loading,
  notes,
  onCreateNote,
  onLastRowVisible,
}: NotesCardContentProps) => {
  const isNotesEmpty = notes.length === 0;

  if (loading && isNotesEmpty) {
    return <SkeletonLoader />;
  }

  if (isNotesEmpty) {
    return (
      <EmptyState.Root>
        <AnimatedPlaceholder type="noNote" />
        <EmptyState.Content>
          <EmptyState.Title>{t`No notes`}</EmptyState.Title>
          <EmptyState.Description>
            {t`There are no associated notes with this record.`}
          </EmptyState.Description>
        </EmptyState.Content>
        {isDefined(onCreateNote) && (
          <Button
            startIcon={<IconPlus />}
            onClick={onCreateNote}
            variant="outline"
          >{t`New note`}</Button>
        )}
      </EmptyState.Root>
    );
  }

  return (
    <div {...stylex.props(styles.notesContainer)}>
      <NoteList notes={notes} />
      <CustomResolverFetchMoreLoader
        loading={loading}
        onLastRowVisible={onLastRowVisible}
      />
    </div>
  );
};
