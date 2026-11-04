import {
  TWENTY_STANDARD_APPLICATION_NAME,
  TWENTY_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER,
} from 'twenty-shared/application';

import { type ApplicationEntity } from 'src/engine/core-modules/application/application.entity';

// description is owned by the frontend (translated) — see getStandardApplicationDescription.
export const TWENTY_STANDARD_APPLICATION = {
  universalIdentifier: TWENTY_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER,
  name: TWENTY_STANDARD_APPLICATION_NAME,
  description: null,
  version: '1.0.1',
} as const satisfies Pick<
  ApplicationEntity,
  'universalIdentifier' | 'name' | 'description' | 'version'
>;
