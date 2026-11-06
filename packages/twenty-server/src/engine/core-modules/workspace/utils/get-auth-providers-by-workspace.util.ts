import { type AuthProvidersDTO } from 'src/engine/core-modules/workspace/dtos/public-workspace-data.dto';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

export const getAuthProvidersByWorkspace = ({
  workspace,
  systemEnabledProviders,
}: {
  workspace: Pick<
    WorkspaceEntity,
    | 'isGoogleAuthEnabled'
    | 'isPasswordAuthEnabled'
    | 'isMicrosoftAuthEnabled'
  >;
  systemEnabledProviders: AuthProvidersDTO;
}) => {
  return {
    google: workspace.isGoogleAuthEnabled && systemEnabledProviders.google,
    magicLink: false,
    password:
      workspace.isPasswordAuthEnabled && systemEnabledProviders.password,
    microsoft:
      workspace.isMicrosoftAuthEnabled && systemEnabledProviders.microsoft,
  };
};
