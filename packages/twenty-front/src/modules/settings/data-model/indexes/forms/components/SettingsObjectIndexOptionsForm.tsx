import { Select } from '@/ui/input/components/Select';
import { useLingui } from '@lingui/react/macro';
import { Controller, useFormContext } from 'react-hook-form';
import { IndexType } from '~/generated-metadata/graphql';
import { type SettingsObjectNewIndexFormValues } from '@/settings/data-model/indexes/forms/validation-schemas/settingsObjectNewIndexFormSchema';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
  },
  fieldLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBottom: spacing['--t-spacing-1'],
  },
});

export const SettingsObjectIndexOptionsForm = () => {
  const { t } = useLingui();
  const { control } = useFormContext<SettingsObjectNewIndexFormValues>();

  const indexTypeOptions = [
    {
      value: IndexType.BTREE,
      label: t`BTREE (default, good for sorting and equality)`,
    },
    {
      value: IndexType.GIN,
      label: t`GIN (full-text search and JSONB)`,
    },
  ];

  return (
    <div {...stylex.props(styles.content)}>
      <div>
        <div {...stylex.props(styles.fieldLabel)}>{t`Type`}</div>
        <Controller
          name="indexType"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Select
              dropdownId="settings-object-new-index-type"
              value={value}
              options={indexTypeOptions}
              onChange={onChange}
              fullWidth
            />
          )}
        />
      </div>
    </div>
  );
};
