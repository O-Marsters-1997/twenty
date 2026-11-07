import { useMemo } from 'react';
import { AI_MODEL_TIERS, type AiModelTier } from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';

import { type ResolvedAiModelTier } from '@/ai/types/ResolvedAiModelTier';
import { getAiModelTierLabel } from '@/ai/utils/getAiModelTierLabel';
import { getPercentDelta } from '@/ai/utils/getPercentDelta';
import { hasCostPerTaskForEveryModel } from '@/ai/utils/hasCostPerTaskForEveryModel';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { aiModelTiersState } from '@/client-config/states/aiModelTiersState';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const REFERENCE_TIER: AiModelTier = 'balanced';

// Mirrors the server: a pin counts only with auto-selection off and the model still served.
export const useAiModelTiers = (): ResolvedAiModelTier[] => {
  const aiModels = useAtomStateValue(aiModelsState);
  const aiModelTiers = useAtomStateValue(aiModelTiersState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const isAutoModelSelectionEnabled =
    currentWorkspace?.isAutoModelSelectionEnabled ?? true;
  const aiModelIdByTier = currentWorkspace?.aiModelIdByTier;

  return useMemo(() => {
    const findModel = (modelId: string | undefined) =>
      aiModels.find((model) => model.modelId === modelId);

    const resolvedModels = AI_MODEL_TIERS.map((tier) => {
      const pinnedModel = isAutoModelSelectionEnabled
        ? undefined
        : findModel(aiModelIdByTier?.[tier]);

      if (isDefined(pinnedModel)) {
        return { tier, model: pinnedModel, isPinned: true };
      }

      return {
        tier,
        model: findModel(
          aiModelTiers.find((instanceTier) => instanceTier.tier === tier)
            ?.modelId,
        ),
        isPinned: false,
      };
    });

    const referenceModel = resolvedModels.find(
      (resolved) => resolved.tier === REFERENCE_TIER,
    )?.model;
    const hasCostPerTaskForEveryTier = hasCostPerTaskForEveryModel(
      resolvedModels.map(({ model }) => model),
    );

    return resolvedModels.map(({ tier, model, isPinned }) => ({
      tier,
      label: getAiModelTierLabel(tier),
      model,
      isPinned,
      speedDeltaPercent: getPercentDelta({
        value: model?.outputTokensPerSecond,
        reference: referenceModel?.outputTokensPerSecond,
      }),
      intelligenceDeltaPercent: getPercentDelta({
        value: model?.intelligenceIndex,
        reference: referenceModel?.intelligenceIndex,
      }),
      costDeltaPercent: getPercentDelta({
        value: hasCostPerTaskForEveryTier ? model?.costPerTask : undefined,
        reference: referenceModel?.costPerTask,
      }),
    }));
  }, [aiModels, aiModelTiers, isAutoModelSelectionEnabled, aiModelIdByTier]);
};
