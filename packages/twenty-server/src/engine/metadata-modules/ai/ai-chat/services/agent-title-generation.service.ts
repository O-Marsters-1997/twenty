import { Injectable, Logger } from '@nestjs/common';

import { generateText } from 'ai';

import { buildAiTelemetry } from 'src/engine/metadata-modules/ai/ai-models/utils/build-ai-telemetry.util';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { buildReasoningProviderOptions } from 'src/engine/metadata-modules/ai/ai-models/utils/build-reasoning-provider-options.util';

@Injectable()
export class AgentTitleGenerationService {
  private readonly logger = new Logger(AgentTitleGenerationService.name);

  constructor(
    private readonly aiModelRegistryService: AiModelRegistryService,
  ) {}

  async generateThreadTitle(
    messageContent: string,
    workspaceId: string,
    userWorkspaceId: string | null,
  ): Promise<string> {
    const defaultModel =
      this.aiModelRegistryService.getDefaultModelForTier('fast');

    if (!defaultModel) {
      this.logger.warn('No default AI model available for title generation');

      return this.generateFallbackTitle(messageContent);
    }

    try {
      const result = await generateText({
        model: defaultModel.model,
        providerOptions: buildReasoningProviderOptions(defaultModel),
        prompt: `Generate a concise, descriptive title (maximum 60 characters) for a chat thread based on the following message. The title should capture the main topic or purpose of the conversation. Return only the title, nothing else. Message: "${messageContent}"`,
        ...buildAiTelemetry({
          functionId: 'agent-title-generation',
          workspaceId,
          userWorkspaceId,
        }),
      });

      return this.cleanTitle(result.text);
    } catch (error) {
      this.logger.error('Failed to generate title with AI:', error);

      return this.generateFallbackTitle(messageContent);
    }
  }

  private generateFallbackTitle(messageContent: string): string {
    const cleanContent = messageContent.trim().replace(/\s+/g, ' ');
    const title = cleanContent.substring(0, 50);

    return cleanContent.length > 50 ? `${title}...` : title;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/^["']|["']$/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }
}
