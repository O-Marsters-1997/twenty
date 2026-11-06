/* @license Enterprise */

import { FeatureFlagKey } from 'twenty-shared/types';

import { BillingEntitlementKey } from 'src/engine/core-modules/billing/enums/billing-entitlement-key.enum';
import { type BillingEntitlements } from 'src/engine/core-modules/billing/types/billing-entitlements.type';
import { isEntitlementActive } from 'src/engine/core-modules/billing/utils/is-entitlement-active.util';

export const isValidationRuleEnforcementEnabled = ({
  featureFlagsMap,
  billingEntitlements,
  isBillingEnabled,
}: {
  featureFlagsMap: Partial<Record<FeatureFlagKey, boolean>>;
  billingEntitlements: BillingEntitlements;
  isBillingEnabled: boolean;
}): boolean =>
  featureFlagsMap[FeatureFlagKey.IS_VALIDATION_RULES_ENABLED] === true &&
  isEntitlementActive({
    isBillingEnabled,
    stripeEntitlementValue:
      billingEntitlements[BillingEntitlementKey.VALIDATION_RULES] ?? false,
  });
