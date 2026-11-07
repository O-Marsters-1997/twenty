import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { OAuth2ClientManagerModule } from 'src/modules/connected-account/oauth2-client-manager/oauth2-client-manager.module';
import { GmailFoldersErrorHandlerService } from 'src/modules/messaging/message-folder-manager/drivers/gmail/services/gmail-folders-error-handler.service';
import { GmailGetAllFoldersService } from 'src/modules/messaging/message-folder-manager/drivers/gmail/services/gmail-get-all-folders.service';
import { SyncMessageFoldersService } from 'src/modules/messaging/message-folder-manager/services/sync-message-folders.service';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageFolderEntity]),
    OAuth2ClientManagerModule,
  ],
  providers: [
    SyncMessageFoldersService,
    GmailGetAllFoldersService,
    GmailFoldersErrorHandlerService,
    provideWorkspaceScopedRepository(MessageFolderEntity),
  ],
  exports: [SyncMessageFoldersService],
})
export class MessagingFolderSyncManagerModule {}
