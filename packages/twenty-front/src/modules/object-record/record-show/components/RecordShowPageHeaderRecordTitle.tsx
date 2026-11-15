import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useRecordIdentifierTitle } from '@/object-record/record-show/hooks/useRecordIdentifierTitle';
import { RecordTitleCell } from '@/object-record/record-title-cell/components/RecordTitleCell';
import { RecordTitleCellContainerType } from '@/object-record/record-title-cell/types/RecordTitleCellContainerType';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  title: {
    flexShrink: '1',
    minWidth: '0',
  },
});

type RecordShowPageHeaderRecordTitleProps = {
  objectNameSingular: string;
  objectRecordId: string;
};

export const RecordShowPageHeaderRecordTitle = ({
  objectNameSingular,
  objectRecordId,
}: RecordShowPageHeaderRecordTitleProps) => {
  const { titleFieldContextValue } = useRecordIdentifierTitle({
    objectNameSingular,
    objectRecordId,
  });

  return (
    <div {...stylex.props(styles.title)}>
      <FieldContext.Provider value={titleFieldContextValue}>
        <RecordTitleCell
          sizeVariant="sm"
          containerType={RecordTitleCellContainerType.PageHeader}
        />
      </FieldContext.Provider>
    </div>
  );
};
