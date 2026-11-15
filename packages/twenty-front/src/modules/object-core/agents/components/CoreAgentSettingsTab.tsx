import { useLingui } from '@lingui/react/macro';

import { AiModelPicker } from '@/ai/components/AiModelPicker';
import { SettingsAgentModelCapabilities } from '@/ai/components/SettingsAgentModelCapabilities';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { IconPicker } from '@/ui/input/components/IconPicker';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { TextArea } from '@/ui/input/components/TextArea';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { IconTrash } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { type Agent } from '~/generated-metadata/graphql';
import { CoreAgentDeleteConfirmationModal } from '@/object-core/agents/components/CoreAgentDeleteConfirmationModal';
import { CoreAgentResponseFormat } from '@/object-core/agents/components/CoreAgentResponseFormat';
import { computeMetadataNameFromLabel } from '@/object-metadata/utils/computeMetadataNameFromLabel';
import { type CoreAgentFormValues } from '@/object-core/agents/validation-schemas/coreAgentFormSchema';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { color, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  iconNameRow: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  nameContainer: {
    flex: '1',
  },
  errorMessage: {
    color: color['--t-color-red'],
    fontSize: fontSize['--t-font-size-sm'],
    marginTop: spacing['--t-spacing-1'],
  },
});

const DELETE_AGENT_MODAL_ID = 'delete-agent-modal';

type CoreAgentSettingsTabProps = {
  formValues: CoreAgentFormValues;
  onFieldChange: (
    field: keyof CoreAgentFormValues,
    value: CoreAgentFormValues[keyof CoreAgentFormValues],
  ) => void;
  disabled: boolean;
  agent?: Agent;
};

export const CoreAgentSettingsTab = ({
  formValues,
  onFieldChange,
  disabled,
  agent,
}: CoreAgentSettingsTabProps) => {
  const { t } = useLingui();
  const { openDialog } = useDialog();

  const aiModels = useAtomStateValue(aiModelsState);
  const noModelsAvailable = aiModels.length === 0;

  const fillNameFromLabel = (label: string) => {
    if (isDefined(label)) {
      onFieldChange('name', computeMetadataNameFromLabel(label));
    }
  };

  return (
    <div {...stylex.props(styles.formContainer)}>
      <div {...stylex.props(styles.formContainer)}>
        <div {...stylex.props(styles.iconNameRow)}>
          <IconPicker
            selectedIconKey={formValues.icon || 'IconLego'}
            onChange={({ iconKey }) => {
              onFieldChange('icon', iconKey);
            }}
            disabled={disabled}
          />

          <div {...stylex.props(styles.nameContainer)}>
            <SettingsTextInput
              instanceId="agent-label-input"
              placeholder={t`Enter agent name*`}
              value={formValues.label}
              onChange={(value) => {
                onFieldChange('label', value);
                fillNameFromLabel(value);
              }}
              fullWidth
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      <div {...stylex.props(styles.formContainer)}>
        <TextArea
          textAreaId="agent-description-textarea"
          placeholder={t`Write a description for this agent`}
          minRows={3}
          value={formValues.description || ''}
          onChange={(value) => onFieldChange('description', value)}
          disabled={disabled}
        />
      </div>
      <div {...stylex.props(styles.formContainer)}>
        {noModelsAvailable ? (
          <div {...stylex.props(styles.errorMessage)}>
            {t`No AI provider is configured on this instance.`}
          </div>
        ) : (
          <AiModelPicker
            modelId={formValues.modelId}
            onModelIdChange={(value) => onFieldChange('modelId', value)}
            disabled={disabled}
          />
        )}
      </div>
      {formValues.modelId && (
        <div {...stylex.props(styles.formContainer)}>
          <SettingsAgentModelCapabilities
            selectedModelId={formValues.modelId}
            modelConfiguration={formValues.modelConfiguration || {}}
            onConfigurationChange={(configuration) =>
              onFieldChange('modelConfiguration', configuration)
            }
            disabled={disabled}
          />
        </div>
      )}
      <div {...stylex.props(styles.formContainer)}>
        <TextArea
          textAreaId="agent-prompt-textarea"
          label={t`System Prompt`}
          placeholder={t`Enter the system prompt that defines this agent's behavior and capabilities`}
          minRows={6}
          maxRows={15}
          value={formValues.prompt}
          onChange={(value) => onFieldChange('prompt', value)}
          disabled={disabled}
        />
      </div>
      <div {...stylex.props(styles.formContainer)}>
        <CoreAgentResponseFormat
          responseFormat={formValues.responseFormat}
          onResponseFormatChange={(format) =>
            onFieldChange('responseFormat', format)
          }
          disabled={disabled}
        />
      </div>
      {!disabled && agent && formValues.isCustom && (
        <Section.Root>
          <Section.Header
            title={t`Danger zone`}
            description={t`Delete this agent`}
          />
          <Button
            startIcon={<IconTrash />}
            onClick={() => openDialog(DELETE_AGENT_MODAL_ID)}
            variant="outline"
            color="danger"
          >{t`Delete Agent`}</Button>
        </Section.Root>
      )}
      {!disabled && agent && (
        <CoreAgentDeleteConfirmationModal
          agentId={agent.id}
          agentName={agent.label}
        />
      )}
    </div>
  );
};
