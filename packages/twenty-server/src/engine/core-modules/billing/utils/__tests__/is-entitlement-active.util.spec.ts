import { isEntitlementActive } from 'src/engine/core-modules/billing/utils/is-entitlement-active.util';

describe('isEntitlementActive', () => {
  it('is true with billing disabled (self-host)', () => {
    expect(
      isEntitlementActive({
        isBillingEnabled: false,
        stripeEntitlementValue: false,
      }),
    ).toBe(true);
  });

  it('follows the Stripe entitlement value when billing is enabled (cloud)', () => {
    expect(
      isEntitlementActive({
        isBillingEnabled: true,
        stripeEntitlementValue: true,
      }),
    ).toBe(true);

    expect(
      isEntitlementActive({
        isBillingEnabled: true,
        stripeEntitlementValue: false,
      }),
    ).toBe(false);
  });
});
