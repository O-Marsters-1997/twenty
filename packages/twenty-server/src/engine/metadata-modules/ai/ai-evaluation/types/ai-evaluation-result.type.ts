import { type AiEvaluationModelAnswer } from 'src/engine/metadata-modules/ai/ai-models/types/ai-evaluation-model.type';

export type AiEvaluationUsage = {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
  };
  outputTokenDetails?: {
    reasoningTokens?: number;
  };
};

export type AiEvaluationRunnerOutput = {
  answers: Record<string, AiEvaluationModelAnswer>;
  usage: AiEvaluationUsage;
};

export type AiEvaluationResult = AiEvaluationRunnerOutput & {
  modelId: string;
};
