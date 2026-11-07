import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { OnboardingStepNavigationDTO } from 'src/engine/core-modules/onboarding/dtos/onboarding-step-navigation.dto';
import { OnboardingStepSuccessDTO } from 'src/engine/core-modules/onboarding/dtos/onboarding-step-success.dto';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';

@UseGuards(
  AuthPrincipalGuard({
    userSession: {
      standard: true,
      playground: true,
      workspaceAgnostic: false,
    },
    apiKey: false,
    oauthClient: false,
    application: false,
  }),
)
@UsePipes(ResolverValidationPipe)
@UseFilters(PreventNestToAutoLogGraphqlErrorsFilter)
@MetadataResolver()
export class OnboardingResolver {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Mutation(() => OnboardingStepSuccessDTO)
  @UseGuards(NoPermissionGuard)
  async skipSyncEmailOnboardingStep(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args({ name: 'isAutoSkipped', type: () => Boolean, defaultValue: false })
    isAutoSkipped: boolean,
  ): Promise<OnboardingStepSuccessDTO> {
    await this.onboardingService.skipOnboardingConnectAccountStep({
      userId: user.id,
      workspaceId: workspace.id,
      isAutoSkipped,
    });

    return { success: true };
  }

  @Mutation(() => OnboardingStepNavigationDTO)
  @UseGuards(NoPermissionGuard)
  async goBackToPreviousOnboardingStep(
    @AuthUser() user: AuthContextUser,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<OnboardingStepNavigationDTO> {
    return this.onboardingService.goBackToPreviousOnboardingStep({
      userId: user.id,
      workspaceId: workspace.id,
    });
  }
}
