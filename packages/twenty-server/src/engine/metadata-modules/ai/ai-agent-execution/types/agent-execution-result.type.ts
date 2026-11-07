import { type LanguageModelUsage, type StepResult, type ToolSet } from 'ai';

export type AgentExecutionResult = {
  result: object;
  usage: LanguageModelUsage;
  isPaused: boolean;
  steps: StepResult<ToolSet>[];
  modelId: string;
};
