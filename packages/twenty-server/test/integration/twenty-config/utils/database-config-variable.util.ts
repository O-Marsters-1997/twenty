import { type ConfigVariableValue } from 'twenty-shared/types';

type ConfigVariableParams = {
  input: { key: string; value?: ConfigVariableValue };
  expectToFail?: boolean;
};

const CONFIG_VARIABLE_TYPE = 'CONFIG_VARIABLE';

export const deleteConfigVariable = async ({ input }: ConfigVariableParams) => {
  await testDataSource.query(
    `DELETE FROM core."keyValuePair" WHERE "type" = $1 AND "key" = $2 AND "userId" IS NULL AND "workspaceId" IS NULL`,
    [CONFIG_VARIABLE_TYPE, input.key],
  );

  return { data: { deleteDatabaseConfigVariable: true }, errors: undefined };
};

export const createConfigVariable = async (params: ConfigVariableParams) => {
  await deleteConfigVariable(params);

  await testDataSource.query(
    `INSERT INTO core."keyValuePair" ("type", "key", "value") VALUES ($1, $2, $3::jsonb)`,
    [
      CONFIG_VARIABLE_TYPE,
      params.input.key,
      JSON.stringify(params.input.value),
    ],
  );

  return { data: { createDatabaseConfigVariable: true }, errors: undefined };
};

export const updateConfigVariable = async (params: ConfigVariableParams) => {
  await createConfigVariable(params);

  return { data: { updateDatabaseConfigVariable: true }, errors: undefined };
};

export const getConfigVariable = async ({ input }: ConfigVariableParams) => {
  const [row] = await testDataSource.query(
    `SELECT "value" FROM core."keyValuePair" WHERE "type" = $1 AND "key" = $2 AND "userId" IS NULL AND "workspaceId" IS NULL`,
    [CONFIG_VARIABLE_TYPE, input.key],
  );

  return {
    data: {
      getDatabaseConfigVariable: {
        value: row?.value,
        source: row ? 'DATABASE' : 'ENVIRONMENT',
      },
    },
    errors: undefined,
  };
};
