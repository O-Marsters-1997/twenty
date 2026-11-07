import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { ApiPath } from 'twenty-shared/types';

import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { GoogleCalendarNotificationHandler } from 'src/modules/connected-account-sync-webhooks/drivers/google/google-calendar-notification.handler';
import { GoogleMessagingNotificationHandler } from 'src/modules/connected-account-sync-webhooks/drivers/google/google-messaging-notification.handler';
import { ConnectedAccountSyncWebhookApiExceptionFilter } from 'src/modules/connected-account-sync-webhooks/filters/connected-account-sync-webhook-api-exception.filter';
import { type GooglePubSubPushMessage } from 'src/modules/connected-account-sync-webhooks/types/google-pubsub-push.type';

@Controller()
@UseFilters(ConnectedAccountSyncWebhookApiExceptionFilter)
@UseGuards(PublicEndpointGuard, NoPermissionGuard)
export class ConnectedAccountSyncWebhooksController {
  constructor(
    private readonly googleMessagingNotificationHandler: GoogleMessagingNotificationHandler,
    private readonly googleCalendarNotificationHandler: GoogleCalendarNotificationHandler,
  ) {}

  @Post(`${ApiPath.Webhooks}/google/messaging`)
  @HttpCode(HttpStatus.OK)
  async handleGoogleMessaging(
    @Body() body: GooglePubSubPushMessage,
    @Headers('authorization') authorizationHeader: string | undefined,
  ): Promise<void> {
    await this.googleMessagingNotificationHandler.handle({
      body,
      authorizationHeader,
    });
  }

  @Post(`${ApiPath.Webhooks}/google/calendar`)
  @HttpCode(HttpStatus.OK)
  async handleGoogleCalendar(
    @Headers('x-goog-channel-id') channelId: string | undefined,
    @Headers('x-goog-resource-state') resourceState: string | undefined,
    @Headers('x-goog-channel-token') channelToken: string | undefined,
  ): Promise<void> {
    await this.googleCalendarNotificationHandler.handle({
      channelId,
      resourceState,
      channelToken,
    });
  }
}
