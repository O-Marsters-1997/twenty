import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountTokenEncryptionModule } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.module';
import { GoogleApiRefreshAccessTokenModule } from 'src/modules/connected-account/refresh-tokens-manager/drivers/google/google-api-refresh-access-token.module';
import { ConnectedAccountRefreshTokensService } from 'src/modules/connected-account/refresh-tokens-manager/services/connected-account-refresh-tokens.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConnectedAccountEntity]),
    GoogleApiRefreshAccessTokenModule,
    ConnectedAccountTokenEncryptionModule,
  ],
  providers: [ConnectedAccountRefreshTokensService],
  exports: [ConnectedAccountRefreshTokensService],
})
export class RefreshTokensManagerModule {}
