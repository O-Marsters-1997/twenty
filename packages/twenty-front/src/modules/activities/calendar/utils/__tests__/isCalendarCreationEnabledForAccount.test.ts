import { isCalendarCreationEnabledForAccount } from '@/activities/calendar/utils/isCalendarCreationEnabledForAccount';
import { ConnectedAccountProvider } from 'twenty-shared/types';

const makeAccount = (
  overrides: Partial<
    Parameters<typeof isCalendarCreationEnabledForAccount>[0]
  > = {},
) =>
  ({
    archivedAt: null,
    provider: ConnectedAccountProvider.GOOGLE,
    calendarChannels: [{ isSyncEnabled: true }],
    ...overrides,
  }) satisfies Parameters<typeof isCalendarCreationEnabledForAccount>[0];

describe('isCalendarCreationEnabledForAccount', () => {
  it('accepts an active supported account with calendar sync enabled', () => {
    expect(isCalendarCreationEnabledForAccount(makeAccount())).toBe(true);
  });

  it('rejects archived accounts and accounts without calendar sync', () => {
    expect(
      isCalendarCreationEnabledForAccount(
        makeAccount({ archivedAt: '2026-08-23T00:00:00Z' }),
      ),
    ).toBe(false);
    expect(
      isCalendarCreationEnabledForAccount(
        makeAccount({ calendarChannels: [{ isSyncEnabled: false }] }),
      ),
    ).toBe(false);
  });
});
