import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { filterSortableFieldMetadataItems } from '@/object-metadata/utils/filterSortableFieldMetadataItems';
import { type RecordSort } from '@/object-record/record-sort/types/RecordSort';
import { Select } from '@/ui/input/components/Select';
import { useLingui } from '@lingui/react/macro';
import { IconArrowsSort, IconTrash, useIcons } from 'twenty-ui/icon';
import { Button, type SelectOption } from 'twenty-ui/primitives/input';
import { v4 as uuidv4 } from 'uuid';
import { ViewSortDirection } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  sortItemContainer: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
  },
  addButtonContainer: {
    marginTop: spacing['--t-spacing-1'],
  },
});

type WorkflowFindRecordsSortsProps = {
  recordSorts: RecordSort[];
  onChange: (recordSorts: RecordSort[]) => void;
  objectMetadataItem: EnrichedObjectMetadataItem;
  readonly: boolean;
};

export const WorkflowFindRecordsSorts = ({
  recordSorts,
  onChange,
  objectMetadataItem,
  readonly,
}: WorkflowFindRecordsSortsProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();

  const sortableFields = objectMetadataItem.fields
    .filter(filterSortableFieldMetadataItems)
    .map((field) => ({
      Icon: getIcon(field.icon),
      label: field.label,
      value: field.id,
    }));

  const directionOptions: Array<SelectOption<ViewSortDirection>> = [
    {
      label: t`Ascending`,
      value: ViewSortDirection.ASC,
    },
    {
      label: t`Descending`,
      value: ViewSortDirection.DESC,
    },
  ];

  const handleAddSort = () => {
    if (readonly) {
      return;
    }

    const newSort: RecordSort = {
      id: uuidv4(),
      fieldMetadataId: sortableFields[0]?.value ?? '',
      direction: ViewSortDirection.ASC,
    };

    onChange([...recordSorts, newSort]);
  };

  const handleRemoveSort = (sortId: string) => {
    if (readonly) {
      return;
    }

    onChange(recordSorts.filter((sort) => sort.id !== sortId));
  };

  const handleFieldChange = (sortId: string, fieldMetadataId: string) => {
    if (readonly) {
      return;
    }

    onChange(
      recordSorts.map((sort) =>
        sort.id === sortId ? { ...sort, fieldMetadataId } : sort,
      ),
    );
  };

  const handleDirectionChange = (
    sortId: string,
    direction: ViewSortDirection,
  ) => {
    if (readonly) {
      return;
    }

    onChange(
      recordSorts.map((sort) =>
        sort.id === sortId ? { ...sort, direction } : sort,
      ),
    );
  };

  return (
    <div {...stylex.props(styles.container)}>
      {recordSorts.map((sort) => {
        return (
          <div key={sort.id} {...stylex.props(styles.sortItemContainer)}>
            <Select
              dropdownId={`workflow-find-records-sort-field-${sort.id}`}
              fullWidth
              disabled={readonly}
              value={sort.fieldMetadataId}
              options={sortableFields}
              onChange={(value) => handleFieldChange(sort.id, value)}
              withSearchInput
            />

            <Select
              dropdownId={`workflow-find-records-sort-direction-${sort.id}`}
              fullWidth
              disabled={readonly}
              value={sort.direction}
              options={directionOptions}
              onChange={(value) =>
                handleDirectionChange(sort.id, value as ViewSortDirection)
              }
            />

            {!readonly && (
              <Button
                onClick={() => handleRemoveSort(sort.id)}
                startIcon={<IconTrash />}
                aria-label={t`Delete`}
                disabled={readonly}
              />
            )}
          </div>
        );
      })}

      <div {...stylex.props(styles.addButtonContainer)}>
        <Button
          startIcon={<IconArrowsSort />}
          size="sm"
          onClick={handleAddSort}
          aria-label={t`Add sort`}
          disabled={readonly}
          variant="outline"
        >{t`Add sort`}</Button>
      </div>
    </div>
  );
};
