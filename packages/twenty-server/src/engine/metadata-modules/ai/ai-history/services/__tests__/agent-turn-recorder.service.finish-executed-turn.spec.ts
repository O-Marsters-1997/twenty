import { type LanguageModelUsage } from 'ai';

import { AgentTurnStatus } from 'src/engine/metadata-modules/ai/ai-history/enums/agent-turn-status.enum';
import { AgentTurnRecorderService } from 'src/engine/metadata-modules/ai/ai-history/services/agent-turn-recorder.service';

const USAGE = {
  inputTokens: 10,
  outputTokens: 5,
  inputTokenDetails: { cacheReadTokens: 0 },
} as LanguageModelUsage;

const RECORDED_USAGE = {
  inputTokens: 10,
  outputTokens: 5,
  cacheReadTokens: 0,
};

const buildService = () => {
  const service = new AgentTurnRecorderService({} as never);
  const recordUsage = jest
    .spyOn(service, 'recordUsage')
    .mockResolvedValue(undefined);
  const finish = jest.spyOn(service, 'finish').mockResolvedValue(true);

  return { service, recordUsage, finish };
};

const turn = {
  workspaceId: 'workspace-id',
  threadId: 'thread-id',
  turnId: 'turn-id',
};

describe('AgentTurnRecorderService.finishExecutedTurn', () => {
  it('records the usage and completes the turn', async () => {
    const { service, recordUsage, finish } = buildService();

    await service.finishExecutedTurn({
      ...turn,
      execution: { modelId: 'model-id', usage: USAGE },
    });

    expect(recordUsage).toHaveBeenCalledWith({
      ...turn,
      usage: RECORDED_USAGE,
    });
    expect(finish).toHaveBeenCalledWith({
      workspaceId: 'workspace-id',
      turnId: 'turn-id',
      modelId: 'model-id',
      status: AgentTurnStatus.COMPLETED,
    });
  });

  it('leaves a turn that asked a question waiting', async () => {
    const { service, finish } = buildService();

    await service.finishExecutedTurn({
      ...turn,
      execution: { usage: USAGE },
      isWaiting: true,
    });

    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({ status: AgentTurnStatus.WAITING_FOR_INPUT }),
    );
  });

  it('still ends the turn when its usage cannot be written', async () => {
    const { service, recordUsage, finish } = buildService();

    recordUsage.mockRejectedValue(new Error('database down'));

    await service.finishExecutedTurn({
      ...turn,
      execution: { usage: USAGE },
      error: { code: 'EXECUTION_FAILED', message: 'Reply not saved.' },
    });

    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AgentTurnStatus.FAILED,
        error: { code: 'EXECUTION_FAILED', message: 'Reply not saved.' },
      }),
    );
  });
});
