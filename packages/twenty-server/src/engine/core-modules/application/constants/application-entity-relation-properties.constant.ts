import { type ApplicationEntity } from 'src/engine/core-modules/application/application.entity';

export const APPLICATION_ENTITY_RELATION_PROPERTIES = [
  'workspace',
  'agents',
  'commandMenuItems',
  'objects',
  'logoFile',
] as const satisfies (keyof ApplicationEntity)[];
