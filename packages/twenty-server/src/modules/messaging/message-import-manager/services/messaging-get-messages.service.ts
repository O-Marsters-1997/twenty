import { Injectable } from '@nestjs/common';

import { ConnectedAccountProvider } from 'twenty-shared/types';

import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import {
  MessageImportDriverException,
  MessageImportDriverExceptionCode,
} from 'src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception';
import { GmailGetMessagesService } from 'src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-messages.service';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';

export type GetMessagesResponse = MessageWithParticipants[];

@Injectable()
export class MessagingGetMessagesService {
  constructor(
    private readonly gmailGetMessagesService: GmailGetMessagesService,
  ) {}

  public async getMessages(
    messageIds: string[],
    connectedAccount: Pick<
      ConnectedAccountEntity,
      | 'provider'
      | 'accessToken'
      | 'refreshToken'
      | 'id'
      | 'handle'
      | 'handleAliases'
      | 'userWorkspaceId'
      | 'connectionParameters'
      | 'workspaceId'
    >,
    messageChannel: Pick<
      MessageChannelEntity,
      'messageFolders' | 'messageFolderImportPolicy'
    >,
  ): Promise<GetMessagesResponse> {
    switch (connectedAccount.provider) {
      case ConnectedAccountProvider.GOOGLE:
        return this.gmailGetMessagesService.getMessages(
          messageIds,
          connectedAccount,
          messageChannel,
        );
      default:
        throw new MessageImportDriverException(
          `Provider ${connectedAccount.provider} is not supported`,
          MessageImportDriverExceptionCode.PROVIDER_NOT_SUPPORTED,
        );
    }
  }
}
