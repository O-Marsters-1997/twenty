import { FeatureFlagKey } from 'twenty-shared/types';

import { isValidationRuleEnforcementEnabled } from 'src/engine/twenty-orm/utils/is-validation-rule-enforcement-enabled.util';

describe('isValidationRuleEnforcementEnabled', () => {
  it('enforces rules when the feature flag is on', () => {
    expect(
      isValidationRuleEnforcementEnabled({
        featureFlagsMap: { [FeatureFlagKey.IS_VALIDATION_RULES_ENABLED]: true },
      }),
    ).toBe(true);
  });

  it('does not enforce rules when the feature flag is off', () => {
    expect(
      isValidationRuleEnforcementEnabled({
        featureFlagsMap: {
          [FeatureFlagKey.IS_VALIDATION_RULES_ENABLED]: false,
        },
      }),
    ).toBe(false);
  });

  it('does not enforce rules when the feature flag is missing', () => {
    expect(isValidationRuleEnforcementEnabled({ featureFlagsMap: {} })).toBe(
      false,
    );
  });
});
