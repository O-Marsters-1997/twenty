import { type ConnectedAccount } from '@/accounts/types/ConnectedAccount';
import { type CalendarChannel } from '@/accounts/types/CalendarChannel';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

const CALENDAR_CREATION_PROVIDERS = new Set([
  ConnectedAccountProvider.GOOGLE,
  ConnectedAccountProvider.MICROSOFT,
]);

export const isCalendarCreationEnabledForAccount = (
  account: Pick<ConnectedAccount, 'archivedAt' | 'provider'> & {
    calendarChannels: Pick<CalendarChannel, 'isSyncEnabled'>[];
  },
) =>
  !isDefined(account.archivedAt) &&
  CALENDAR_CREATION_PROVIDERS.has(account.provider) &&
  account.calendarChannels.some((channel) => channel.isSyncEnabled);
