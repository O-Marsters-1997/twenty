import { type ApplicationEntity } from 'src/engine/core-modules/application/application.entity';

export const APPLICATION_ENTITY_RELATION_PROPERTIES = [
  'workspace',
  'agents',
  'commandMenuItems',
  'logicFunctions',
  'objects',
  'packageJsonFile',
  'yarnLockFile',
  'logoFile',
  'primaryPublicDomain',
  'publicDomains',
] as const satisfies (keyof ApplicationEntity)[];
