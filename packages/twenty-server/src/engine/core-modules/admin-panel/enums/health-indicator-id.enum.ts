import { registerEnumType } from '@nestjs/graphql';

export enum HealthIndicatorId {
  database = 'database',
  redis = 'redis',
  worker = 'worker',
  app = 'app',
}

registerEnumType(HealthIndicatorId, {
  name: 'HealthIndicatorId',
});
