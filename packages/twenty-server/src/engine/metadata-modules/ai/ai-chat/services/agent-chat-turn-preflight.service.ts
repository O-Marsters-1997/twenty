import { Injectable } from '@nestjs/common';

import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AgentChatThreadService } from 'src/engine/metadata-modules/ai/ai-chat/services/agent-chat-thread.service';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { getChatModelId } from 'src/engine/metadata-modules/ai/ai-models/utils/get-chat-model-id.util';
import {
  AiException,
  AiExceptionCode,
} from 'src/engine/metadata-modules/ai/ai.exception';

@Injectable()
export class AgentChatTurnPreflightService {
  constructor(
    private readonly aiModelRegistryService: AiModelRegistryService,
    private readonly threadService: AgentChatThreadService,
  ) {}

  async assertCanStartChatTurn({
    threadId,
    modelId,
    workspaceMemberId,
    workspace,
  }: {
    threadId: string;
    modelId?: string;
    workspaceMemberId: string;
    workspace: WorkspaceEntity;
  }) {
    if (this.aiModelRegistryService.getAvailableModels().length === 0) {
      throw new AiException(
        'No AI models are available. Configure at least one AI provider.',
        AiExceptionCode.API_KEY_NOT_CONFIGURED,
      );
    }

    this.aiModelRegistryService.validateModelAvailability(
      getChatModelId({ requestedModelId: modelId, workspace }),
    );

    const thread = await this.threadService.getWritableThread({
      threadId,
      workspaceMemberId,
      workspaceId: workspace.id,
    });

    return thread;
  }
}
