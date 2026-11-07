import { type LanguageModelUsage, type StepResult, type ToolSet } from 'ai';

export type RecordableAgentExecution = {
  steps?: Pick<StepResult<ToolSet>, 'content'>[];
  isPaused?: boolean;
  modelId?: string;
  usage?: LanguageModelUsage;
};
