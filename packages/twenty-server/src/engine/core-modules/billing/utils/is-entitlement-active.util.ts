/* @license Enterprise */

export const isEntitlementActive = ({
  isBillingEnabled,
  stripeEntitlementValue,
}: {
  isBillingEnabled: boolean;
  stripeEntitlementValue: boolean;
}): boolean => !isBillingEnabled || stripeEntitlementValue;
