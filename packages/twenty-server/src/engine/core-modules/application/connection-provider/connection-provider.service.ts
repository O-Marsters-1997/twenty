import { Injectable } from '@nestjs/common';

import { ConnectionProviderExceptionCode } from 'src/engine/core-modules/application/connection-provider/connection-provider-exception-code.enum';
import { ConnectionProviderEntity } from 'src/engine/core-modules/application/connection-provider/connection-provider.entity';
import { ConnectionProviderException } from 'src/engine/core-modules/application/connection-provider/connection-provider.exception';
import { assertOAuthProvider } from 'src/engine/core-modules/application/connection-provider/utils/assert-oauth-provider.util';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

@Injectable()
export class ConnectionProviderService {
  constructor(
    @InjectWorkspaceScopedRepository(ConnectionProviderEntity)
    private readonly connectionProviderRepository: WorkspaceScopedRepository<ConnectionProviderEntity>,
  ) {}

  async getClientCredentials(
    provider: ConnectionProviderEntity,
  ): Promise<{ clientId: string; clientSecret: string }> {
    assertOAuthProvider(provider);

    throw new ConnectionProviderException(
      `OAuth client credentials are not configured for provider "${provider.name}"`,
      ConnectionProviderExceptionCode.CLIENT_CREDENTIALS_NOT_CONFIGURED,
    );
  }

  async areClientCredentialsConfigured(
    provider: ConnectionProviderEntity,
  ): Promise<boolean> {
    const result = await this.areClientCredentialsConfiguredBatch({
      providers: [provider],
      workspaceId: provider.workspaceId,
    });

    return result.get(provider.id) ?? false;
  }

  async areClientCredentialsConfiguredBatch({
    providers,
  }: {
    providers: ConnectionProviderEntity[];
    workspaceId: string;
  }): Promise<Map<string, boolean>> {
    return new Map(providers.map((provider) => [provider.id, false]));
  }

  async findOneByApplicationAndName({
    applicationId,
    name,
    workspaceId,
  }: {
    applicationId: string;
    name: string;
    workspaceId: string;
  }): Promise<ConnectionProviderEntity | null> {
    return this.connectionProviderRepository.findOne(workspaceId, {
      where: { applicationId, name },
    });
  }

  async findOneByIdOrThrow({
    id,
    workspaceId,
  }: {
    id: string;
    workspaceId: string;
  }): Promise<ConnectionProviderEntity> {
    const provider = await this.connectionProviderRepository.findOne(
      workspaceId,
      { where: { id } },
    );

    if (!isDefined(provider)) {
      throw new ConnectionProviderException(
        `Connection provider with id "${id}" not found`,
        ConnectionProviderExceptionCode.PROVIDER_NOT_FOUND,
      );
    }

    return provider;
  }

  async findManyByApplication({
    applicationId,
    workspaceId,
  }: {
    applicationId: string;
    workspaceId: string;
  }): Promise<ConnectionProviderEntity[]> {
    return this.connectionProviderRepository.find(workspaceId, {
      where: { applicationId },
    });
  }
}
