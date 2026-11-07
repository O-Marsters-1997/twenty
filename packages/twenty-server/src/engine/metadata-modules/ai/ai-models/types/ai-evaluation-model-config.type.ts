import {
  type AiEvaluationQuestionType,
  type AiSdkPackage,
  type DataResidency,
} from 'twenty-shared/ai';

export type AiEvaluationModelConfig = {
  modelId: string;
  providerName: string;
  name: string;
  sdkPackage: AiSdkPackage;
  label: string;
  description: string;
  supportedQuestionTypes: AiEvaluationQuestionType[];
  maxCriteriaPerQuestion?: number;
  maxScoreLevels?: number;
  medianLatencyMs?: number;
  dataResidency?: DataResidency;
  zeroDataRetention?: boolean;
  isDeprecated?: boolean;
};
