import { RecordChip } from '@/object-record/components/RecordChip';
import { type FieldWidgetRelationRecord } from '@/page-layout/widgets/field/types/FieldWidgetRelationRecord';
import { SidePanelProvider } from '@/ui/layout/side-panel/contexts/SidePanelContext';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    width: '100%',
  },
  relationChipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-1'],
  },
});

type FieldWidgetRelationRecordChipsProps = {
  relationRecords: FieldWidgetRelationRecord[];
  isInSidePanel: boolean;
};

export const FieldWidgetRelationRecordChips = ({
  relationRecords,
  isInSidePanel,
}: FieldWidgetRelationRecordChipsProps) => {
  if (relationRecords.length === 0) {
    return null;
  }

  return (
    <SidePanelProvider value={{ isInSidePanel }}>
      <div {...stylex.props(styles.container)}>
        <div {...stylex.props(styles.relationChipsContainer)}>
          {relationRecords.map(({ record, objectNameSingular }) => (
            <RecordChip
              key={`${objectNameSingular}-${record.id}`}
              objectNameSingular={objectNameSingular}
              record={record}
            />
          ))}
        </div>
      </div>
    </SidePanelProvider>
  );
};
