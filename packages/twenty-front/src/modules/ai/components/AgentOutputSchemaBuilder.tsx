import { type OutputSchemaField } from '@/ai/types/OutputSchemaField';
import { createDefaultOutputSchemaField } from '@/ai/utils/createDefaultOutputSchemaField';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { isValidAgentResponseSchemaPropertyKey } from 'twenty-shared/ai';
import { IconPlus } from 'twenty-ui/icon';
import { Collapsible } from 'twenty-ui/primitives/layout';
import { ListItemButton } from 'twenty-ui/components/navigation';
import { AgentOutputFieldTypeSelector } from '@/ai/components/AgentOutputFieldTypeSelector';
import { AgentOutputSchemaFieldHeader } from '@/ai/components/AgentOutputSchemaFieldHeader';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
type AgentOutputSchemaBuilderProps = {
  fields: OutputSchemaField[];
  onChange: (fields: OutputSchemaField[]) => void;
  readonly?: boolean;
};

const styles = stylex.create({
  outputSchemaContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  fieldsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  outputSchemaFieldContainer: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
  },
  settingsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingInline: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-2'],
  },
  addFieldButtonContainer: {
    marginTop: spacing['--t-spacing-2'],
  },
  messageContentContainer: {
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    lineHeight: 'normal',
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
  },
  messageDescription: {
    color: fontColor['--t-font-color-secondary'],
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
});

export const AgentOutputSchemaBuilder = ({
  fields,
  onChange,
  readonly,
}: AgentOutputSchemaBuilderProps) => {
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(
    () => new Set(fields.map((field) => field.id)),
  );

  const toggleField = (id: string) => {
    setExpandedFieldIds((previousExpandedFieldIds) => {
      const nextExpandedFieldIds = new Set(previousExpandedFieldIds);

      if (nextExpandedFieldIds.has(id)) {
        nextExpandedFieldIds.delete(id);
      } else {
        nextExpandedFieldIds.add(id);
      }

      return nextExpandedFieldIds;
    });
  };

  const addField = () => {
    const newField = createDefaultOutputSchemaField();

    setExpandedFieldIds(
      (previousExpandedFieldIds) =>
        new Set([...previousExpandedFieldIds, newField.id]),
    );

    onChange([...fields, newField]);
  };

  const removeField = (id: string) => {
    setExpandedFieldIds((previousExpandedFieldIds) => {
      const nextExpandedFieldIds = new Set(previousExpandedFieldIds);
      nextExpandedFieldIds.delete(id);
      return nextExpandedFieldIds;
    });

    onChange(fields.filter((field) => field.id !== id));
  };

  const showRemoveFieldButton = !readonly && fields.length > 1;

  const updateField = (id: string, updates: Partial<OutputSchemaField>) => {
    onChange(
      fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field,
      ),
    );
  };

  const getVariableNameError = (name: string): string | undefined => {
    if (
      !isNonEmptyString(name) ||
      isValidAgentResponseSchemaPropertyKey(name)
    ) {
      return undefined;
    }

    return t`Use only letters, numbers, underscores, dots or hyphens (max 64 characters).`;
  };

  return (
    <div {...stylex.props(styles.outputSchemaContainer)}>
      <InputLabel>{t`Output`}</InputLabel>

      {fields.length === 0 && (
        <div {...stylex.props(styles.outputSchemaFieldContainer)}>
          <div {...stylex.props(styles.messageContentContainer)}>
            <div
              data-testid="empty-output-schema-message-description"
              {...stylex.props(styles.messageDescription)}
            >
              {t`Click on "Add Output Field" below to define the structure of your agent's response. These fields will be used to format and validate the agent's output when the workflow is executed, and can be referenced by subsequent workflow steps.`}
            </div>
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <div {...stylex.props(styles.fieldsContainer)}>
          {fields.map((field) => {
            const isExpanded = expandedFieldIds.has(field.id);

            return (
              <div
                key={field.id}
                {...stylex.props(styles.outputSchemaFieldContainer)}
              >
                <AgentOutputSchemaFieldHeader
                  name={field.name}
                  isExpanded={isExpanded}
                  onToggle={() => toggleField(field.id)}
                  onRemove={
                    showRemoveFieldButton
                      ? () => removeField(field.id)
                      : undefined
                  }
                />
                <Collapsible.Root open={isExpanded}>
                  <Collapsible.Panel>
                    <div {...stylex.props(styles.settingsContent)}>
                      <FormFieldInputContainer>
                        <FormTextFieldInput
                          label={t`Variable Name`}
                          placeholder={t`e.g., summary, status, count`}
                          defaultValue={field.name}
                          error={getVariableNameError(field.name)}
                          onChange={(value) =>
                            updateField(field.id, { name: value.trim() })
                          }
                          readonly={readonly}
                        />
                      </FormFieldInputContainer>

                      <FormFieldInputContainer>
                        <AgentOutputFieldTypeSelector
                          onChange={(value) =>
                            updateField(field.id, { type: value })
                          }
                          value={field.type}
                          disabled={readonly}
                          dropdownId={`output-field-type-selector-${field.id}`}
                        />
                      </FormFieldInputContainer>

                      <FormFieldInputContainer>
                        <FormTextFieldInput
                          label={t`Instruction for AI`}
                          placeholder={t`Brief explanation of this output field`}
                          defaultValue={field.description}
                          onChange={(value) =>
                            updateField(field.id, { description: value })
                          }
                          readonly={readonly}
                        />
                      </FormFieldInputContainer>
                    </div>
                  </Collapsible.Panel>
                </Collapsible.Root>
              </div>
            );
          })}
        </div>
      )}

      {!readonly && (
        <div {...stylex.props(styles.addFieldButtonContainer)}>
          <ListItemButton
            startIcon={<IconPlus />}
            onClick={addField}
          >{t`Add Output Field`}</ListItemButton>
        </div>
      )}
    </div>
  );
};
