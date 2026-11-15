import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';

import { IconPicker } from '@/ui/input/components/IconPicker';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { TextArea } from '@/ui/input/components/TextArea';
import { type ValidationRuleFormValues } from '@/validation-rules/types/ValidationRuleFormValues';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  nameRow: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    width: '100%',
  },
});

type SettingsValidationRuleNameFormProps = {
  values: ValidationRuleFormValues;
  onChange: (values: ValidationRuleFormValues) => void;
};

export const SettingsValidationRuleNameForm = ({
  values,
  onChange,
}: SettingsValidationRuleNameFormProps) => {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.nameRow)}>
        <IconPicker
          dropdownId="validation-rule-icon"
          selectedIconKey={values.icon}
          onChange={({ iconKey }) => onChange({ ...values, icon: iconKey })}
          variant="outline"
        />
        <SettingsTextInput
          instanceId="validation-rule-name"
          placeholder={t`Customer deals need an amount`}
          value={values.name}
          onChange={(name) => onChange({ ...values, name })}
          fullWidth
        />
      </div>
      <TextArea
        textAreaId="validation-rule-description"
        placeholder={t`Write a description`}
        minRows={2}
        maxRows={5}
        value={values.description ?? ''}
        onChange={(description) =>
          onChange({
            ...values,
            description: isNonEmptyString(description) ? description : null,
          })
        }
      />
    </div>
  );
};
