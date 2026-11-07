import { ConnectedAccountProvider, EmailOperation } from '@/types';
import { canConnectedAccountPerformEmailOperation } from '@/utils/email/canConnectedAccountPerformEmailOperation';

describe('canConnectedAccountPerformEmailOperation', () => {
  it('lets Google send and draft', () => {
    const connectedAccount = { provider: ConnectedAccountProvider.GOOGLE };

    expect(
      canConnectedAccountPerformEmailOperation({
        connectedAccount,
        operation: EmailOperation.SEND,
      }),
    ).toBe(true);
    expect(
      canConnectedAccountPerformEmailOperation({
        connectedAccount,
        operation: EmailOperation.DRAFT,
      }),
    ).toBe(true);
  });

  it('lets an email group send but never draft', () => {
    const connectedAccount = { provider: ConnectedAccountProvider.EMAIL_GROUP };

    expect(
      canConnectedAccountPerformEmailOperation({
        connectedAccount,
        operation: EmailOperation.SEND,
      }),
    ).toBe(true);
    expect(
      canConnectedAccountPerformEmailOperation({
        connectedAccount,
        operation: EmailOperation.DRAFT,
      }),
    ).toBe(false);
  });

  it('refuses a provider absent from both allowlists', () => {
    for (const provider of [ConnectedAccountProvider.APP]) {
      expect(
        canConnectedAccountPerformEmailOperation({
          connectedAccount: { provider },
          operation: EmailOperation.SEND,
        }),
      ).toBe(false);
    }
  });
});
