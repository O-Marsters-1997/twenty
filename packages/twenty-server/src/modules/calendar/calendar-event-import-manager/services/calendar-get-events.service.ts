import { Injectable } from '@nestjs/common';

import { ConnectedAccountProvider } from 'twenty-shared/types';

import { GoogleCalendarGetEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/services/google-calendar-get-events.service';
import {
  CalendarEventImportException,
  CalendarEventImportExceptionCode,
} from 'src/modules/calendar/calendar-event-import-manager/exceptions/calendar-event-import.exception';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';

export type GetCalendarEventsResponse = {
  calendarEventIds: string[];
  calendarEventIdsToDelete: string[];
  nextSyncCursor: string;
};

@Injectable()
export class CalendarGetCalendarEventsService {
  constructor(
    private readonly googleCalendarGetEventsService: GoogleCalendarGetEventsService,
  ) {}

  public async getCalendarEvents(
    connectedAccount: Pick<
      ConnectedAccountEntity,
      | 'provider'
      | 'accessToken'
      | 'refreshToken'
      | 'id'
      | 'connectionParameters'
      | 'handle'
      | 'workspaceId'
    >,
    syncCursor?: string,
  ): Promise<GetCalendarEventsResponse> {
    switch (connectedAccount.provider) {
      case ConnectedAccountProvider.GOOGLE:
        return this.googleCalendarGetEventsService.getCalendarEvents(
          connectedAccount,
          syncCursor,
        );
      default:
        throw new CalendarEventImportException(
          `Provider ${connectedAccount.provider} is not supported`,
          CalendarEventImportExceptionCode.PROVIDER_NOT_SUPPORTED,
        );
    }
  }
}
