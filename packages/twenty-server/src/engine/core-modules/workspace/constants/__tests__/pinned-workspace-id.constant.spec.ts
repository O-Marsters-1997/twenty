import { PINNED_WORKSPACE_ID } from 'src/engine/core-modules/workspace/constants/pinned-workspace-id.constant';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

describe('PINNED_WORKSPACE_ID', () => {
  it('maps to the schema name the Go baseline migration creates', () => {
    expect(getWorkspaceSchemaName(PINNED_WORKSPACE_ID)).toBe(
      'workspace_2abogkkt2zd45pa9aun09djpf',
    );
  });
});
