import { ObjectType } from '@nestjs/graphql';

import { ConnectedAccountDTO } from 'src/engine/metadata-modules/connected-account/dtos/connected-account.dto';

@ObjectType('ConnectedAccountPublicDTO')
export class ConnectedAccountPublicDTO extends ConnectedAccountDTO {}
