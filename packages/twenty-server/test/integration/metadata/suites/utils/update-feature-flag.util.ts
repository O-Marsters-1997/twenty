import { type FeatureFlagKey } from 'twenty-shared/types';

import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

export const updateFeatureFlag = async ({
  featureFlag,
  value,
  workspaceId = SEED_APPLE_WORKSPACE_ID,
}: {
  featureFlag: FeatureFlagKey;
  value: boolean;
  workspaceId?: string;
  expectToFail?: boolean;
}) => {
  await testDataSource.query(
    `INSERT INTO core."featureFlag" ("key", "workspaceId", "value") VALUES ($1, $2, $3)
     ON CONFLICT ("key", "workspaceId") DO UPDATE SET "value" = EXCLUDED."value"`,
    [featureFlag, workspaceId, value],
  );
};
