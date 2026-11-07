import { Body, Controller, Post, UseFilters, UseGuards } from '@nestjs/common';

import { generateText } from 'ai';
import { PermissionFlagType } from 'twenty-shared/constants';
import { ApiPath } from 'twenty-shared/types';

import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import type { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';
import { AiRestApiExceptionFilter } from 'src/engine/metadata-modules/ai/filters/ai-api-exception.filter';
import { GenerateTextInput } from 'src/engine/metadata-modules/ai/ai-generate-text/dtos/generate-text.input';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { buildReasoningProviderOptions } from 'src/engine/metadata-modules/ai/ai-models/utils/build-reasoning-provider-options.util';
import { buildAiTelemetry } from 'src/engine/metadata-modules/ai/ai-models/utils/build-ai-telemetry.util';
import { PermissionsRestApiExceptionFilter } from 'src/engine/metadata-modules/permissions/utils/permissions-rest-api-exception.filter';
import { AuthRestApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-rest-api-exception.filter';
import { AUTO_SELECT_MODEL_ID_BY_TIER } from 'twenty-shared/ai';

@Controller(`${ApiPath.Rest}/ai`)
@UseGuards(
  JwtAuthGuard,
  AuthPrincipalGuard({
    userSession: {
      standard: true,
      playground: true,
      workspaceAgnostic: false,
    },
    apiKey: true,
    oauthClient: true,
    application: true,
  }),
)
@UseFilters(
  RestApiExceptionFilter,
  PermissionsRestApiExceptionFilter,
  AiRestApiExceptionFilter,
  AuthRestApiExceptionFilter,
)
export class AiGenerateTextController {
  constructor(
    private readonly aiModelRegistryService: AiModelRegistryService,
  ) {}

  @Post('generate-text')
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.AI))
  async handleGenerateText(
    @Body() body: GenerateTextInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ) {
    if (this.aiModelRegistryService.getAvailableModels().length === 0) {
      throw new AiException(
        'No AI models are available. Please configure at least one AI provider API key.',
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    const resolvedModelId = body.modelId ?? AUTO_SELECT_MODEL_ID_BY_TIER.fast;

    this.aiModelRegistryService.validateModelAvailability(resolvedModelId);

    const registeredModel =
      await this.aiModelRegistryService.resolveModelForAgent(
        { modelId: resolvedModelId },
        workspace,
      );

    const result = await generateText({
      model: registeredModel.model,
      providerOptions: buildReasoningProviderOptions(registeredModel),
      instructions: body.systemPrompt,
      prompt: body.userPrompt,
      ...buildAiTelemetry({
        functionId: 'ai-generate-text',
        workspaceId: workspace.id,
        userWorkspaceId,
      }),
    });

    return {
      text: result.text,
      usage: {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      },
    };
  }
}
