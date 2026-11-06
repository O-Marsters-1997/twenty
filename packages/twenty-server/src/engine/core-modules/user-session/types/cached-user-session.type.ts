import { type AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';

export type CachedUserSession = {
  sessionId: string;
  userId: string;
  workspaceId: string | null;
  userWorkspaceId: string | null;
  authProvider: AuthProviderEnum;
  expiresAt: string;
  lastActiveAt: string;
  authenticatedAt: string;
};
