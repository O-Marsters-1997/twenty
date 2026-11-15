import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import {
  AUTO_SELECT_MODEL_ID_BY_TIER,
  AUTO_SELECT_WORKSPACE_DEFAULT_MODEL_ID,
} from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';
import { LightButton } from 'twenty-ui/components/input';

import { AiModelTierSlider } from '@/ai/components/AiModelTierSlider';
import { useAiModelTiers } from '@/ai/hooks/useAiModelTiers';
import { useWorkspaceAiModelTiers } from '@/ai/hooks/useWorkspaceAiModelTiers';
import { getAiModelTierForAgentModelId } from '@/ai/utils/getAiModelTierForAgentModelId';
import { getNearestAiModelTier } from '@/ai/utils/getNearestAiModelTier';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { AiModelPinSelect } from '@/ai/components/AiModelPinSelect';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor, borderRadius, fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  sliderCard: {
    background: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    cornerShape: 'round',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  footer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  hint: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-sm'],
  },
});

type AiModelPickerProps = {
  modelId: string;
  onModelIdChange: (modelId: string) => void;
  disabled?: boolean;
};

export const AiModelPicker = ({
  modelId,
  onModelIdChange,
  disabled = false,
}: AiModelPickerProps) => {
  const { t } = useLingui();
  const tiers = useAiModelTiers();
  const aiModels = useAtomStateValue(aiModelsState);
  const { agentTier } = useWorkspaceAiModelTiers();

  const isWorkspaceDefault = modelId === AUTO_SELECT_WORKSPACE_DEFAULT_MODEL_ID;
  const tierFromModelId = getAiModelTierForAgentModelId(modelId, agentTier);
  const hasPinnedModel = !isDefined(tierFromModelId);
  const pinnedModel = hasPinnedModel
    ? aiModels.find((model) => model.modelId === modelId)
    : undefined;

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(hasPinnedModel);

  const selectedTier =
    tierFromModelId ?? getNearestAiModelTier(pinnedModel, tiers);

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.sliderCard)}>
        <AiModelTierSlider
          selectedTier={selectedTier}
          onTierChange={(tier) =>
            onModelIdChange(AUTO_SELECT_MODEL_ID_BY_TIER[tier])
          }
          title={hasPinnedModel ? (pinnedModel?.label ?? modelId) : undefined}
          disabled={disabled}
        />
      </div>
      <div {...stylex.props(styles.footer)}>
        <span {...stylex.props(styles.hint)}>
          {isWorkspaceDefault
            ? t`Follows the workspace default for agents`
            : hasPinnedModel
              ? t`Pinned to a specific model`
              : t`Set for this agent only`}
        </span>
        {!isAdvancedOpen && !disabled && (
          <LightButton
            emphasis="subtle"
            onClick={() => setIsAdvancedOpen(true)}
          >{t`Advanced`}</LightButton>
        )}
      </div>
      {isAdvancedOpen && (
        <AiModelPinSelect
          dropdownId="ai-model-picker-pinned-model"
          label={t`Pin a specific model`}
          description={t`Overrides the mode above until you switch back to automatic`}
          modelId={hasPinnedModel ? modelId : null}
          onChange={(pinnedModelId) =>
            onModelIdChange(
              pinnedModelId ?? AUTO_SELECT_WORKSPACE_DEFAULT_MODEL_ID,
            )
          }
          aiModels={aiModels}
          emptyOptionLabel={t`Automatic`}
          disabled={disabled}
          dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
        />
      )}
    </div>
  );
};
