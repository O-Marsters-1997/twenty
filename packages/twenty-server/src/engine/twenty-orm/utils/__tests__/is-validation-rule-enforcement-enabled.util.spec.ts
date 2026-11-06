/* @license Enterprise */

import { FeatureFlagKey } from 'twenty-shared/types';

import { BillingEntitlementKey } from 'src/engine/core-modules/billing/enums/billing-entitlement-key.enum';
import { isValidationRuleEnforcementEnabled } from 'src/engine/twenty-orm/utils/is-validation-rule-enforcement-enabled.util';

const FLAG_ON = { [FeatureFlagKey.IS_VALIDATION_RULES_ENABLED]: true };

describe('isValidationRuleEnforcementEnabled', () => {
  it('enforces rules on a workspace whose plan includes them', () => {
    expect(
      isValidationRuleEnforcementEnabled({
        featureFlagsMap: FLAG_ON,
        billingEntitlements: { [BillingEntitlementKey.VALIDATION_RULES]: true },
        isBillingEnabled: true,
      }),
    ).toBe(true);
  });

  it('enforces rules on a self-hosted instance with billing disabled', () => {
    expect(
      isValidationRuleEnforcementEnabled({
        featureFlagsMap: FLAG_ON,
        billingEntitlements: {},
        isBillingEnabled: false,
      }),
    ).toBe(true);
  });

  it.each([
    [
      'the workspace plan does not include them',
      {
        featureFlagsMap: FLAG_ON,
        billingEntitlements: {
          [BillingEntitlementKey.VALIDATION_RULES]: false,
        },
        isBillingEnabled: true,
      },
    ],
    [
      'the feature flag is off',
      {
        featureFlagsMap: {},
        billingEntitlements: { [BillingEntitlementKey.VALIDATION_RULES]: true },
        isBillingEnabled: true,
      },
    ],
  ])('stops enforcing rules when %s', (_label, input) => {
    expect(isValidationRuleEnforcementEnabled(input)).toBe(false);
  });
});
