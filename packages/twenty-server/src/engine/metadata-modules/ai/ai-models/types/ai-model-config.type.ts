import {
  type AiModelEffort,
  type AiSdkPackage,
  type DataResidency,
} from 'twenty-shared/ai';
import { type AiModelBenchmark } from 'src/engine/metadata-modules/ai/ai-models/types/ai-model-benchmark.type';
import { type ModelFamily } from 'src/engine/metadata-modules/ai/ai-models/types/model-family.enum';

export type AiModelConfig = {
  // `provider/modelName`
  modelId: string;
  sdkPackage: AiSdkPackage;
  label: string;
  description: string;
  modelFamily?: ModelFamily;
  dataResidency?: DataResidency;
  zeroDataRetention?: boolean;
  contextWindowTokens: number;
  maxOutputTokens: number;
  modalities?: string[];
  supportsReasoning?: boolean;
  efforts?: AiModelEffort[];
  // Pinned by a variant id (`model@effort`); unset runs the provider default.
  effort?: AiModelEffort;
  benchmark?: AiModelBenchmark;
  benchmarkByEffort?: Partial<Record<AiModelEffort, AiModelBenchmark>>;
  isDeprecated?: boolean;
};
