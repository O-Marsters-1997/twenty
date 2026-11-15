import { type RecordSort } from '@/object-record/record-sort/types/RecordSort';
import { currentRecordSortsComponentState } from '@/object-record/record-sort/states/currentRecordSortsComponentState';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconArrowsSort, IconTrash } from 'twenty-ui/icon';
import { Button, type SelectOption } from 'twenty-ui/primitives/input';
import { Select } from '@/ui/input/components/Select';
import { v4 as uuidv4 } from 'uuid';
import { ViewSortDirection } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  sortItemContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  addButtonContainer: {
    marginTop: spacing['--t-spacing-1'],
  },
});

type RecordTableSettingsSortsContentProps = {
  sortableFieldOptions: Array<SelectOption<string>>;
  directionOptions: Array<SelectOption<ViewSortDirection>>;
  onUpdate?: () => void;
};

export const RecordTableSettingsSortsContent = ({
  sortableFieldOptions,
  directionOptions,
  onUpdate,
}: RecordTableSettingsSortsContentProps) => {
  const [currentRecordSorts, setCurrentRecordSorts] = useAtomComponentState(
    currentRecordSortsComponentState,
  );

  const handleAddSort = () => {
    const firstAvailableField = sortableFieldOptions[0]?.value;

    if (!isDefined(firstAvailableField)) {
      return;
    }

    const newSort: RecordSort = {
      id: uuidv4(),
      fieldMetadataId: firstAvailableField,
      direction: ViewSortDirection.ASC,
    };

    setCurrentRecordSorts([...currentRecordSorts, newSort]);
    onUpdate?.();
  };

  const handleRemoveSort = (sortId: string) => {
    setCurrentRecordSorts(
      currentRecordSorts.filter((sort) => sort.id !== sortId),
    );
    onUpdate?.();
  };

  const handleFieldChange = (sortId: string, fieldMetadataId: string) => {
    setCurrentRecordSorts(
      currentRecordSorts.map((sort) =>
        sort.id === sortId ? { ...sort, fieldMetadataId } : sort,
      ),
    );
    onUpdate?.();
  };

  const handleDirectionChange = (
    sortId: string,
    direction: ViewSortDirection,
  ) => {
    setCurrentRecordSorts(
      currentRecordSorts.map((sort) =>
        sort.id === sortId ? { ...sort, direction } : sort,
      ),
    );
    onUpdate?.();
  };

  return (
    <>
      {currentRecordSorts.map((sort) => (
        <div key={sort.id} {...stylex.props(styles.sortItemContainer)}>
          <Select
            dropdownId={`record-table-widget-sort-field-${sort.id}`}
            fullWidth
            value={sort.fieldMetadataId}
            options={sortableFieldOptions}
            onChange={(value) => handleFieldChange(sort.id, value)}
            withSearchInput
          />
          <Select
            dropdownId={`record-table-widget-sort-direction-${sort.id}`}
            fullWidth
            value={sort.direction}
            options={directionOptions}
            onChange={(value) =>
              handleDirectionChange(sort.id, value as ViewSortDirection)
            }
          />
          <Button
            onClick={() => handleRemoveSort(sort.id)}
            startIcon={<IconTrash />}
            aria-label={t`Delete`}
          />
        </div>
      ))}
      <div {...stylex.props(styles.addButtonContainer)}>
        <Button
          startIcon={<IconArrowsSort />}
          size="sm"
          onClick={handleAddSort}
          aria-label={t`Add sort`}
          variant="outline"
        >{t`Add sort`}</Button>
      </div>
    </>
  );
};
