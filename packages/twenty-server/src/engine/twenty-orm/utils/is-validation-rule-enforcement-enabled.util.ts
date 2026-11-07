/* @license Enterprise */

import { FeatureFlagKey } from 'twenty-shared/types';

export const isValidationRuleEnforcementEnabled = ({
  featureFlagsMap,
}: {
  featureFlagsMap: Partial<Record<FeatureFlagKey, boolean>>;
}): boolean =>
  featureFlagsMap[FeatureFlagKey.IS_VALIDATION_RULES_ENABLED] === true;
