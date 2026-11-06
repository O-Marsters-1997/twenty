import { getAuthProvidersByWorkspace } from 'src/engine/core-modules/workspace/utils/get-auth-providers-by-workspace.util';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

describe('getAuthProvidersByWorkspace', () => {
  const mockWorkspace = {
    isGoogleAuthEnabled: true,
    isPasswordAuthEnabled: true,
    isMicrosoftAuthEnabled: false,
  } as unknown as WorkspaceEntity;

  const systemEnabledProviders = {
    google: true,
    magicLink: false,
    password: true,
    microsoft: true,
  };

  it('should return correct auth providers for given workspace', () => {
    const result = getAuthProvidersByWorkspace({
      workspace: mockWorkspace,
      systemEnabledProviders,
    });

    expect(result).toEqual({
      google: true,
      magicLink: false,
      password: true,
      microsoft: false,
    });
  });

  it('should disable Google auth if the system has it disabled', () => {
    const result = getAuthProvidersByWorkspace({
      workspace: mockWorkspace,
      systemEnabledProviders: { ...systemEnabledProviders, google: false },
    });

    expect(result.google).toBe(false);
  });
});
