import { type ApplicationCapability } from 'twenty-shared/application';

import { toApplicationCapabilities } from 'src/engine/core-modules/application/utils/to-application-capabilities.util';

export const resolveSyncedApplicationCapabilities = ({
  grantedCapabilities,
  requestedCapabilities,
}: {
  grantedCapabilities: ApplicationCapability[] | undefined;
  requestedCapabilities: string[] | undefined;
}): ApplicationCapability[] => [
  ...new Set([
    ...toApplicationCapabilities(grantedCapabilities),
    ...toApplicationCapabilities(requestedCapabilities),
  ]),
];
