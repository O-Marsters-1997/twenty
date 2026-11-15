import { FormSelectFieldInput } from '@/object-record/record-field/ui/form-types/components/FormSelectFieldInput';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { WorkflowFormFieldSettingsByType } from '@/workflow/workflow-steps/workflow-actions/form-action/components/WorkflowFormFieldSettingsByType';
import { FORM_SELECT_FIELD_TYPE_OPTIONS } from '@/workflow/workflow-steps/workflow-actions/form-action/constants/FormSelectFieldTypeOptions';
import { type WorkflowFormActionField } from '@/workflow/workflow-steps/workflow-actions/form-action/types/WorkflowFormActionField';
import { type WorkflowFormFieldType } from '@/workflow/workflow-steps/workflow-actions/form-action/types/WorkflowFormFieldType';
import { getDefaultFormFieldSettings } from '@/workflow/workflow-steps/workflow-actions/form-action/utils/getDefaultFormFieldSettings';
import { t } from '@lingui/core/macro';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconSettingsAutomation, IconX } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, backgroundTransparent, borderColor, borderRadius, fontColor } from 'twenty-ui/theme/tokens.stylex';
type WorkflowEditActionFormFieldSettingsProps = {
  field: WorkflowFormActionField;
  onChange: (field: WorkflowFormActionField) => void;
  onClose: () => void;
};

const styles = stylex.create({
  formFieldSettingsContainer: {
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    marginTop: spacing['--t-spacing-3'],
  },
  settingsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  settingsHeader: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    display: 'grid',
    gap: spacing['--t-spacing-1'],
    gridTemplateColumns: '1fr 24px',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-2'],
  },
  titleContainer: {
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-3'],
  },
  closeButtonContainer: {
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const WorkflowEditActionFormFieldSettings = ({
  field,
  onChange,
  onClose,
}: WorkflowEditActionFormFieldSettingsProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.formFieldSettingsContainer)}>
      <div {...stylex.props(styles.settingsHeader)}>
        <div {...stylex.props(styles.titleContainer)}>
          <IconSettingsAutomation
            size={theme.icon.size.md}
            color={theme.font.color.primary}
          />
          {t`Input settings`}
        </div>
        <div {...stylex.props(styles.closeButtonContainer)}>
          <LightIconButton
            data-testid="close-button"
            size="sm"
            emphasis="standard"
            onClick={onClose}
            aria-label={t`Close`}
          >
            <IconX />
          </LightIconButton>
        </div>
      </div>
      <div {...stylex.props(styles.settingsContent)}>
        <FormFieldInputContainer>
          <InputLabel>{t`Type`}</InputLabel>
          <FormSelectFieldInput
            options={FORM_SELECT_FIELD_TYPE_OPTIONS}
            onChange={(newType: string | null) => {
              if (newType === null) {
                return;
              }

              const type = newType as WorkflowFormFieldType;
              const { name, label, settings } =
                getDefaultFormFieldSettings(type);

              onChange({
                ...field,
                type,
                name,
                label,
                settings,
                placeholder: '',
              });
            }}
            defaultValue={field.type}
          />
        </FormFieldInputContainer>
        <WorkflowFormFieldSettingsByType field={field} onChange={onChange} />
      </div>
    </div>
  );
};
