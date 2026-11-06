import { type ApplicationDTO } from 'src/engine/core-modules/application/dtos/application.dto';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';

export const fromFlatApplicationToApplicationDto = ({
  createdAt,
  description,
  id,
  logo,
  name,
  universalIdentifier,
  version,
}: FlatApplication): ApplicationDTO => {
  return {
    createdAt: new Date(createdAt),
    description: description ?? undefined,
    id,
    logo: logo ?? undefined,
    name,
    objects: [],
    universalIdentifier,
    version: version ?? undefined,
  };
};
