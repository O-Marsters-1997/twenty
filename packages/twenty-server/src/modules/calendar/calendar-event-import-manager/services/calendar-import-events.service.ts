import { Injectable } from '@nestjs/common';

import { ConnectedAccountProvider } from 'twenty-shared/types';

import { GoogleCalendarImportEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/services/google-calendar-import-events.service';
import {
  CalendarEventImportException,
  CalendarEventImportExceptionCode,
} from 'src/modules/calendar/calendar-event-import-manager/exceptions/calendar-event-import.exception';
import { type FetchedCalendarEvent } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';

@Injectable()
export class CalendarImportEventsService {
  constructor(
    private readonly googleCalendarImportEventsService: GoogleCalendarImportEventsService,
  ) {}

  public async getCalendarEvents(
    connectedAccount: Pick<ConnectedAccountEntity, 'provider' | 'id'>,
    eventExternalIds: string[],
  ): Promise<FetchedCalendarEvent[]> {
    switch (connectedAccount.provider) {
      case ConnectedAccountProvider.GOOGLE:
        return this.googleCalendarImportEventsService.getCalendarEvents(
          connectedAccount,
          eventExternalIds,
        );
      default:
        throw new CalendarEventImportException(
          `Provider ${connectedAccount.provider} is not supported`,
          CalendarEventImportExceptionCode.PROVIDER_NOT_SUPPORTED,
        );
    }
  }
}
