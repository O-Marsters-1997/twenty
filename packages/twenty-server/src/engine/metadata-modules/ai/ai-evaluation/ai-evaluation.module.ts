import { Module } from '@nestjs/common';

import { AiEvaluationService } from 'src/engine/metadata-modules/ai/ai-evaluation/services/ai-evaluation.service';
import { NativeEvaluationRunner } from 'src/engine/metadata-modules/ai/ai-evaluation/services/native-evaluation.runner';

@Module({
  providers: [NativeEvaluationRunner, AiEvaluationService],
  exports: [AiEvaluationService],
})
export class AiEvaluationModule {}
