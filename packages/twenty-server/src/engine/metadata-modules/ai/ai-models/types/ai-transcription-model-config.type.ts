import { type AiSdkPackage, type DataResidency } from 'twenty-shared/ai';

export type AiTranscriptionModelConfig = {
  modelId: string;
  sdkPackage: AiSdkPackage;
  label: string;
  description: string;
  dataResidency?: DataResidency;
  zeroDataRetention?: boolean;
  isDeprecated?: boolean;
};
