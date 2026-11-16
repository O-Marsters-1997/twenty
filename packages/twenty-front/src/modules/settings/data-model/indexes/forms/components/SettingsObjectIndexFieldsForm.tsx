import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { buildIndexableSelectOptions } from '@/settings/data-model/indexes/utils/buildIndexableSelectOptions';
import { decodeIndexableOptionValue } from '@/settings/data-model/indexes/utils/decodeIndexableOptionValue';
import { encodeIndexableOptionValue } from '@/settings/data-model/indexes/utils/encodeIndexableOptionValue';
import { Select } from '@/ui/input/components/Select';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { IconTrash, useIcons } from 'twenty-ui/icon';
import { type SelectOption } from 'twenty-ui/primitives/input';
import { IconButton } from 'twenty-ui/components/input';
import { type SettingsObjectNewIndexFormValues } from '@/settings/data-model/indexes/forms/validation-schemas/settingsObjectNewIndexFormSchema';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsObjectIndexFieldsFormProps = {
  indexableFields: FieldMetadataItem[];
};

const styles = stylex.create({
  fieldRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    marginBottom: spacing['--t-spacing-2'],
  },
  selectWrapper: {
    flex: '1',
    minWidth: '0',
  },
  placeholder: {
    height: spacing['--t-spacing-8'],
    width: spacing['--t-spacing-8'],
  },
});

export const SettingsObjectIndexFieldsForm = ({
  indexableFields,
}: SettingsObjectIndexFieldsFormProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const { control } = useFormContext<SettingsObjectNewIndexFormValues>();

  const allOptions = useMemo(
    () => buildIndexableSelectOptions({ indexableFields, getIcon }),
    [indexableFields, getIcon],
  );

  const emptyFieldOption: SelectOption<string> = {
    label: t`Select a field`,
    value: '',
  };

  return (
    <Controller
      name="fields"
      control={control}
      render={({ field: { value, onChange } }) => {
        const rows: (
          | SettingsObjectNewIndexFormValues['fields'][number]
          | null
        )[] = [...value, null];

        const pickedValues = value.map((entry) =>
          encodeIndexableOptionValue(entry.fieldMetadataId, entry.subFieldName),
        );

        const handleSelect = (rowIndex: number, newOptionValue: string) => {
          if (newOptionValue === '') return;

          const next = [...value];
          const decoded = decodeIndexableOptionValue(newOptionValue);

          if (rowIndex < value.length) {
            next[rowIndex] = decoded;
          } else {
            next.push(decoded);
          }

          onChange(next);
        };

        const handleRemove = (rowIndex: number) => {
          onChange(value.filter((_, index) => index !== rowIndex));
        };

        return (
          <>
            {rows.map((entry, rowIndex) => {
              const currentValue = entry
                ? encodeIndexableOptionValue(
                    entry.fieldMetadataId,
                    entry.subFieldName,
                  )
                : '';

              const availableOptions = allOptions.filter(
                (option) =>
                  option.value === currentValue ||
                  !pickedValues.includes(option.value),
              );

              const isEmptyRow = entry === null;

              return (
                <div
                  key={`${rowIndex}-${currentValue || 'empty'}`}
                  {...stylex.props(styles.fieldRow)}
                >
                  <div {...stylex.props(styles.selectWrapper)}>
                    <Select
                      dropdownId={`settings-object-new-index-field-${rowIndex}`}
                      value={currentValue}
                      options={availableOptions}
                      emptyOption={emptyFieldOption}
                      onChange={(newValue) => handleSelect(rowIndex, newValue)}
                      fullWidth
                      withSearchInput
                    />
                  </div>
                  {isEmptyRow ? (
                    <div {...stylex.props(styles.placeholder)} />
                  ) : (
                    <IconButton
                      variant="ghost"
                      size="md"
                      onClick={() => handleRemove(rowIndex)}
                      aria-label={t`Remove field`}
                    >
                      <IconTrash />
                    </IconButton>
                  )}
                </div>
              );
            })}
          </>
        );
      }}
    />
  );
};
