import { UseFilters, UseGuards } from '@nestjs/common';
import { Parent, ResolveField } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { ApplicationExceptionFilter } from 'src/engine/core-modules/application/application-exception-filter';
import { ApplicationDTO } from 'src/engine/core-modules/application/dtos/application.dto';
import { buildPublicAssetLogoUrl } from 'src/engine/core-modules/application/utils/build-public-asset-logo-url.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';

@UseGuards(
  AuthPrincipalGuard({
    userSession: {
      standard: true,
      impersonated: true,
      playground: true,
      workspaceAgnostic: false,
    },
    apiKey: true,
    oauthClient: true,
    application: true,
  }),
  NoPermissionGuard,
)
@MetadataResolver(() => ApplicationDTO)
@UseFilters(ApplicationExceptionFilter)
export class ApplicationResolver {
  constructor(
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  // Resolves the display url of the logo bundled in the installed
  // application's public assets, so clients never build file urls themselves.
  @ResolveField(() => String, { nullable: true })
  logoUrl(
    @Parent() application: Pick<ApplicationDTO, 'id' | 'logo'>,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): string | null {
    return buildPublicAssetLogoUrl({
      logo: application.logo,
      serverUrl: this.twentyConfigService.get('SERVER_URL'),
      workspaceId: workspace.id,
      applicationId: application.id,
    });
  }

}
