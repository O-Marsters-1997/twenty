import { Module } from '@nestjs/common';

import { GoogleWebhookSubscriptionDriver } from 'src/modules/connected-account/webhook-subscription-manager/drivers/google/google-webhook-subscription.driver';
import { WebhookSubscriptionDriverFactory } from 'src/modules/connected-account/webhook-subscription-manager/services/webhook-subscription-driver-factory.service';
import { OAuth2ClientManagerModule } from 'src/modules/connected-account/oauth2-client-manager/oauth2-client-manager.module';

@Module({
  imports: [OAuth2ClientManagerModule],
  providers: [
    GoogleWebhookSubscriptionDriver,
    WebhookSubscriptionDriverFactory,
  ],
  exports: [WebhookSubscriptionDriverFactory],
})
export class WebhookSubscriptionManagerModule {}
