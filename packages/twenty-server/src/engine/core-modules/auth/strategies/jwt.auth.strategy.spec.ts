import { randomUUID } from 'crypto';

import { msg } from '@lingui/core/macro';
import { type Repository } from 'typeorm';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { type JwtPayload } from 'src/engine/core-modules/auth/types/jwt-payload.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { JwtAuthStrategy } from './jwt.auth.strategy';

describe('JwtAuthStrategy', () => {
  let strategy: JwtAuthStrategy;
  let userWorkspaceRepository: any;
  let jwtWrapperService: any;
  let workspaceCacheService: any;
  let coreEntityCacheService: any;
  let workspaceRepository: { findOne: jest.Mock };

  const jwt = {
    sub: 'sub-default',
    jti: 'jti-default',
  };

  let workspaceStore: Record<string, any>;
  let userStore: Record<string, any>;
  let applicationStore: Record<string, Record<string, any>>;
  let apiKeyStore: Record<string, Record<string, any>>;

  beforeEach(() => {
    workspaceStore = {};
    userStore = {};
    applicationStore = {};
    apiKeyStore = {};

    userWorkspaceRepository = {
      findOne: jest.fn(),
    };
    workspaceRepository = {
      findOne: jest.fn(),
    };

    jwtWrapperService = {
      extractJwtFromRequest: jest.fn(() => () => 'token'),
      resolveVerificationKey: jest.fn(async () => ({
        key: 'mock-key',
        algorithm: 'HS256',
      })),
    };

    workspaceCacheService = {
      getOrRecompute: jest.fn(
        async (workspaceId: string, cacheKeys: string[]) => {
          const result: Record<string, any> = {};

          if (cacheKeys.includes('flatWorkspaceMemberMaps')) {
            result.flatWorkspaceMemberMaps = {
              byId: {
                'workspace-member-id': {
                  id: 'workspace-member-id',
                  userId: 'valid-user-id',
                  workspaceId: 'workspace-id',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  deletedAt: null,
                },
              },
              idByUserId: {
                'valid-user-id': 'workspace-member-id',
              },
            };
          }

          if (cacheKeys.includes('flatApplicationMaps')) {
            result.flatApplicationMaps = {
              byId: applicationStore[workspaceId] ?? {},
            };
          }

          if (cacheKeys.includes('apiKeyMap')) {
            result.apiKeyMap = apiKeyStore[workspaceId] ?? {};
          }

          return result;
        },
      ),
    };

    coreEntityCacheService = {
      get: jest.fn(async (keyName: string, entityId: string) => {
        if (keyName === 'workspaceEntity') {
          return workspaceStore[entityId] ?? null;
        }

        if (keyName === 'user') {
          return userStore[entityId] ?? null;
        }

        if (keyName === 'userWorkspaceEntity') {
          return userWorkspaceRepository.findOne({ where: { id: entityId } });
        }

        return null;
      }),
      invalidate: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createStrategy = () =>
    new JwtAuthStrategy(
      jwtWrapperService,
      workspaceCacheService,
      coreEntityCacheService,
      workspaceRepository as unknown as Repository<WorkspaceEntity>,
    );

  describe('API_KEY validation', () => {
    it('should throw AuthException if type is API_KEY and workspace is not found', async () => {
      const payload = {
        ...jwt,
        type: JwtTokenTypeEnum.API_KEY,
      };

      strategy = createStrategy();

      await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
        new AuthException(
          'Workspace not found',
          AuthExceptionCode.WORKSPACE_NOT_FOUND,
        ),
      );
    });

    it('should throw AuthExceptionCode if type is API_KEY not found', async () => {
      const payload = {
        ...jwt,
        type: JwtTokenTypeEnum.API_KEY,
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = 'workspace-id';
      workspaceStore[payload.sub] = mockWorkspace;
      apiKeyStore['workspace-id'] = {};

      strategy = createStrategy();

      await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
        new AuthException(
          'This API Key is revoked',
          AuthExceptionCode.FORBIDDEN_EXCEPTION,
        ),
      );
    });

    it('should throw AuthExceptionCode if API_KEY is revoked', async () => {
      const payload = {
        ...jwt,
        type: JwtTokenTypeEnum.API_KEY,
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = 'workspace-id';
      workspaceStore[payload.sub] = mockWorkspace;
      apiKeyStore['workspace-id'] = {
        [payload.jti]: {
          id: 'api-key-id',
          revokedAt: new Date(),
        },
      };

      strategy = createStrategy();

      await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
        new AuthException(
          'This API Key is revoked',
          AuthExceptionCode.FORBIDDEN_EXCEPTION,
        ),
      );
    });

    it.each([
      { offsetMilliseconds: -1, isAllowed: false },
      { offsetMilliseconds: 0, isAllowed: true },
      { offsetMilliseconds: 1, isAllowed: true },
    ])(
      'validates cached API-key expiry at offset $offsetMilliseconds ms',
      async ({ offsetMilliseconds, isAllowed }) => {
        const payload: JwtPayload = {
          ...jwt,
          type: JwtTokenTypeEnum.API_KEY,
          workspaceId: 'workspace-id',
        };
        const workspace = new WorkspaceEntity();

        workspace.id = 'workspace-id';
        workspaceStore[payload.sub] = workspace;
        apiKeyStore[workspace.id] = {
          [jwt.jti]: {
            id: 'api-key-id',
            revokedAt: null,
            expiresAt: new Date(Date.now() + offsetMilliseconds).toISOString(),
          },
        };

        strategy = createStrategy();

        if (isAllowed) {
          await expect(strategy.validate(payload)).resolves.toMatchObject({
            apiKey: { id: 'api-key-id' },
          });
        } else {
          await expect(strategy.validate(payload)).rejects.toThrow(
            'This API Key is expired',
          );
        }
      },
    );

    it('should be truthy if type is API_KEY and API_KEY is not revoked', async () => {
      const payload = {
        ...jwt,
        type: JwtTokenTypeEnum.API_KEY,
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = 'workspace-id';
      workspaceStore[payload.sub] = mockWorkspace;
      apiKeyStore['workspace-id'] = {
        [payload.jti]: {
          id: 'api-key-id',
          revokedAt: null,
        },
      };

      strategy = createStrategy();

      const result = await strategy.validate(payload as JwtPayload);

      expect(result).toBeTruthy();
      expect(result.apiKey?.id).toBe('api-key-id');
    });
  });

  describe('ACCESS token validation', () => {
    it('should throw AuthExceptionCode if type is ACCESS, no jti, and user not found', async () => {
      const validUserId = 'valid-user-id';
      const validUserWorkspaceId = randomUUID();
      const validWorkspaceId = randomUUID();

      const payload = {
        sub: validUserId,
        type: JwtTokenTypeEnum.ACCESS,
        userWorkspaceId: validUserWorkspaceId,
        workspaceId: validWorkspaceId,
      };

      workspaceStore[validWorkspaceId] = new WorkspaceEntity();

      strategy = createStrategy();

      await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
        new AuthException(
          'User or user workspace not found',
          AuthExceptionCode.USER_NOT_FOUND,
          {
            userFriendlyMessage: msg`User does not have access to this workspace`,
          },
        ),
      );

      try {
        await strategy.validate(payload as JwtPayload);
      } catch (e) {
        expect(e.code).toBe(AuthExceptionCode.USER_NOT_FOUND);
      }
    });

    it('should throw AuthExceptionCode if type is ACCESS, no jti, and userWorkspace not found', async () => {
      const validUserId = 'valid-user-id';
      const validUserWorkspaceId = randomUUID();
      const validWorkspaceId = randomUUID();

      const payload = {
        sub: validUserId,
        type: JwtTokenTypeEnum.ACCESS,
        userWorkspaceId: validUserWorkspaceId,
        workspaceId: validWorkspaceId,
      };

      workspaceStore[validWorkspaceId] = new WorkspaceEntity();
      userStore[validUserId] = { lastName: 'lastNameDefault' };

      userWorkspaceRepository.findOne.mockResolvedValue(null);

      strategy = createStrategy();

      await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
        new AuthException(
          'User or user workspace not found',
          AuthExceptionCode.USER_NOT_FOUND,
          {
            userFriendlyMessage: msg`User does not have access to this workspace`,
          },
        ),
      );

      try {
        await strategy.validate(payload as JwtPayload);
      } catch (e) {
        expect(e.code).toBe(AuthExceptionCode.USER_NOT_FOUND);
      }
    });

    it('should not throw if type is ACCESS, no jti, and user and userWorkspace exist', async () => {
      const validUserId = 'valid-user-id';
      const validUserWorkspaceId = randomUUID();
      const validWorkspaceId = randomUUID();

      const payload = {
        sub: validUserId,
        type: JwtTokenTypeEnum.ACCESS,
        userWorkspaceId: validUserWorkspaceId,
        workspaceId: validWorkspaceId,
      };

      workspaceStore[validWorkspaceId] = new WorkspaceEntity();
      userStore[validUserId] = {
        id: validUserId,
        lastName: 'lastNameDefault',
      };

      coreEntityCacheService.get.mockImplementation(
        async (keyName: string, entityId: string) => {
          if (keyName === 'workspaceEntity') {
            return workspaceStore[entityId] ?? null;
          }

          if (keyName === 'user') {
            return userStore[entityId] ?? null;
          }

          if (keyName === 'userWorkspaceEntity') {
            return {
              id: validUserWorkspaceId,
              user: { id: validUserId, lastName: 'lastNameDefault' },
              workspace: { id: validWorkspaceId },
            };
          }

          return null;
        },
      );

      strategy = createStrategy();

      const user = await strategy.validate(payload as JwtPayload);

      expect(user.user?.lastName).toBe('lastNameDefault');
      expect(user.userWorkspaceId).toBe(validUserWorkspaceId);
    });

    it('should reject when the user workspace belongs to a different workspace than the token', async () => {
      const validUserId = 'valid-user-id';
      const validUserWorkspaceId = randomUUID();
      const tokenWorkspaceId = randomUUID();
      const otherWorkspaceId = randomUUID();

      const payload = {
        sub: validUserId,
        type: JwtTokenTypeEnum.ACCESS,
        userWorkspaceId: validUserWorkspaceId,
        workspaceId: tokenWorkspaceId,
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = tokenWorkspaceId;
      workspaceStore[tokenWorkspaceId] = mockWorkspace;
      userStore[validUserId] = { id: validUserId, lastName: 'lastNameDefault' };

      coreEntityCacheService.get.mockImplementation(
        async (keyName: string, entityId: string) => {
          if (keyName === 'workspaceEntity') {
            return workspaceStore[entityId] ?? null;
          }

          if (keyName === 'user') {
            return userStore[entityId] ?? null;
          }

          if (keyName === 'userWorkspaceEntity') {
            return {
              id: validUserWorkspaceId,
              workspaceId: otherWorkspaceId,
              user: { id: validUserId },
              workspace: { id: otherWorkspaceId },
            };
          }

          return null;
        },
      );

      strategy = createStrategy();

      await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
        new AuthException(
          'User or user workspace not found',
          AuthExceptionCode.USER_NOT_FOUND,
          {
            userFriendlyMessage: msg`User does not have access to this workspace`,
          },
        ),
      );
    });
  });

  describe('APPLICATION_ACCESS token validation', () => {
    it('should allow a cleanup token when its exact workspace deletion is pending', async () => {
      const applicationId = randomUUID();
      const workspaceId = randomUUID();
      const workspaceDeletedAt = new Date('2026-08-18T10:00:00.000Z');
      const workspace = Object.assign(new WorkspaceEntity(), {
        id: workspaceId,
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
        updatedAt: new Date('2026-08-18T10:00:00.000Z'),
        deletedAt: workspaceDeletedAt,
      });
      const application = { id: applicationId };

      workspaceRepository.findOne.mockResolvedValue(workspace);
      applicationStore[workspaceId] = { [applicationId]: application };

      strategy = createStrategy();

      await expect(
        strategy.validate({
          sub: applicationId,
          type: JwtTokenTypeEnum.APPLICATION_ACCESS,
          applicationId,
          workspaceId,
          workspaceDeletionRequestTimestamp: workspaceDeletedAt.toISOString(),
        } as JwtPayload),
      ).resolves.toMatchObject({
        application,
        workspace: {
          id: workspaceId,
          deletedAt: workspaceDeletedAt.toISOString(),
        },
        tokenType: JwtTokenTypeEnum.APPLICATION_ACCESS,
      });
    });

    it('should reject a cleanup token when it belongs to a different deletion request', async () => {
      const applicationId = randomUUID();
      const workspaceId = randomUUID();

      workspaceStore[workspaceId] = Object.assign(new WorkspaceEntity(), {
        id: workspaceId,
        deletedAt: null,
      });

      workspaceRepository.findOne.mockResolvedValue(
        Object.assign(new WorkspaceEntity(), {
          id: workspaceId,
          createdAt: new Date('2026-08-01T10:00:00.000Z'),
          updatedAt: new Date('2026-08-18T10:00:00.000Z'),
          deletedAt: new Date('2026-08-18T10:00:00.000Z'),
        }),
      );

      strategy = createStrategy();

      await expect(
        strategy.validate({
          sub: applicationId,
          type: JwtTokenTypeEnum.APPLICATION_ACCESS,
          applicationId,
          workspaceId,
          workspaceDeletionRequestTimestamp: '2026-08-17T10:00:00.000Z',
        } as JwtPayload),
      ).rejects.toMatchObject({
        code: AuthExceptionCode.FORBIDDEN_EXCEPTION,
        message: 'Workspace deletion request not found',
      });
      expect(workspaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: workspaceId },
        withDeleted: true,
      });
    });

    it('should throw AuthExceptionCode if type is APPLICATION_ACCESS, and application not found', async () => {
      const validApplicationId = randomUUID();
      const validWorkspaceId = randomUUID();

      const payload = {
        sub: validApplicationId,
        type: JwtTokenTypeEnum.APPLICATION_ACCESS,
        applicationId: validApplicationId,
        workspaceId: validWorkspaceId,
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = validWorkspaceId;
      workspaceStore[validWorkspaceId] = mockWorkspace;

      strategy = createStrategy();

      await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
        new AuthException(
          'Application not found',
          AuthExceptionCode.APPLICATION_NOT_FOUND,
          {
            userFriendlyMessage: msg`Application not found.`,
          },
        ),
      );

      try {
        await strategy.validate(payload as JwtPayload);
      } catch (e) {
        expect(e.code).toBe(AuthExceptionCode.APPLICATION_NOT_FOUND);
      }
    });

    it('should reject an application token bound to a user that cannot be resolved', async () => {
      const validApplicationId = randomUUID();
      const validWorkspaceId = randomUUID();
      const removedUserId = randomUUID();

      const payload = {
        sub: validApplicationId,
        type: JwtTokenTypeEnum.APPLICATION_ACCESS,
        applicationId: validApplicationId,
        workspaceId: validWorkspaceId,
        userId: removedUserId,
        userWorkspaceId: randomUUID(),
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = validWorkspaceId;
      workspaceStore[validWorkspaceId] = mockWorkspace;
      applicationStore[validWorkspaceId] = {
        [validApplicationId]: { id: validApplicationId },
      };

      strategy = createStrategy();

      try {
        await strategy.validate(payload as JwtPayload);
        throw new Error('Expected validate to reject');
      } catch (e) {
        expect(e.code).toBe(AuthExceptionCode.USER_NOT_FOUND);
      }
    });

    it('should reject an application token whose user is no longer a workspace member', async () => {
      const validApplicationId = randomUUID();
      const validWorkspaceId = randomUUID();
      const validUserId = randomUUID();
      const validUserWorkspaceId = randomUUID();

      const payload = {
        sub: validApplicationId,
        type: JwtTokenTypeEnum.APPLICATION_ACCESS,
        applicationId: validApplicationId,
        workspaceId: validWorkspaceId,
        userId: validUserId,
        userWorkspaceId: validUserWorkspaceId,
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = validWorkspaceId;
      mockWorkspace.activationStatus = WorkspaceActivationStatus.ACTIVE;
      workspaceStore[validWorkspaceId] = mockWorkspace;
      applicationStore[validWorkspaceId] = {
        [validApplicationId]: { id: validApplicationId },
      };
      userStore[validUserId] = { id: validUserId };

      coreEntityCacheService.get.mockImplementation(
        async (keyName: string, entityId: string) => {
          if (keyName === 'workspaceEntity') {
            return workspaceStore[entityId] ?? null;
          }

          if (keyName === 'user') {
            return userStore[entityId] ?? null;
          }

          if (keyName === 'userWorkspaceEntity') {
            return {
              id: validUserWorkspaceId,
              workspaceId: validWorkspaceId,
              user: { id: validUserId },
              workspace: { id: validWorkspaceId },
            };
          }

          return null;
        },
      );

      strategy = createStrategy();

      try {
        await strategy.validate(payload as JwtPayload);
        throw new Error('Expected validate to reject');
      } catch (e) {
        expect(e.code).toBe(AuthExceptionCode.FORBIDDEN_EXCEPTION);
      }
    });

    it('should reject an application token whose workspace member is soft-deleted', async () => {
      const validApplicationId = randomUUID();
      const validWorkspaceId = randomUUID();
      const validUserId = randomUUID();
      const validUserWorkspaceId = randomUUID();
      const validWorkspaceMemberId = randomUUID();

      const payload = {
        sub: validApplicationId,
        type: JwtTokenTypeEnum.APPLICATION_ACCESS,
        applicationId: validApplicationId,
        workspaceId: validWorkspaceId,
        userId: validUserId,
        userWorkspaceId: validUserWorkspaceId,
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = validWorkspaceId;
      mockWorkspace.activationStatus = WorkspaceActivationStatus.ACTIVE;
      workspaceStore[validWorkspaceId] = mockWorkspace;
      applicationStore[validWorkspaceId] = {
        [validApplicationId]: { id: validApplicationId },
      };
      userStore[validUserId] = { id: validUserId };

      workspaceCacheService.getOrRecompute.mockImplementation(
        async (workspaceId: string, cacheKeys: string[]) => {
          const result: Record<string, any> = {};

          if (cacheKeys.includes('flatWorkspaceMemberMaps')) {
            result.flatWorkspaceMemberMaps = {
              byId: {
                [validWorkspaceMemberId]: {
                  id: validWorkspaceMemberId,
                  userId: validUserId,
                  deletedAt: new Date(),
                },
              },
              idByUserId: { [validUserId]: validWorkspaceMemberId },
            };
          }

          if (cacheKeys.includes('flatApplicationMaps')) {
            result.flatApplicationMaps = {
              byId: applicationStore[workspaceId] ?? {},
            };
          }

          return result;
        },
      );

      coreEntityCacheService.get.mockImplementation(
        async (keyName: string, entityId: string) => {
          if (keyName === 'workspaceEntity') {
            return workspaceStore[entityId] ?? null;
          }

          if (keyName === 'user') {
            return userStore[entityId] ?? null;
          }

          if (keyName === 'userWorkspaceEntity') {
            return {
              id: validUserWorkspaceId,
              workspaceId: validWorkspaceId,
              user: { id: validUserId },
              workspace: { id: validWorkspaceId },
            };
          }

          return null;
        },
      );

      strategy = createStrategy();

      try {
        await strategy.validate(payload as JwtPayload);
        throw new Error('Expected validate to reject');
      } catch (e) {
        expect(e.code).toBe(AuthExceptionCode.FORBIDDEN_EXCEPTION);
      }
    });
  });

  describe('Impersonation validation', () => {
    it('should reject an impersonation token', async () => {
      const validUserWorkspaceId = randomUUID();
      const validWorkspaceId = randomUUID();

      const payload = {
        sub: 'valid-user-id',
        type: JwtTokenTypeEnum.ACCESS,
        userWorkspaceId: validUserWorkspaceId,
        workspaceId: validWorkspaceId,
        isImpersonating: true,
        impersonatorUserWorkspaceId: randomUUID(),
        impersonatedUserWorkspaceId: validUserWorkspaceId,
      };

      const mockWorkspace = new WorkspaceEntity();

      mockWorkspace.id = validWorkspaceId;
      workspaceStore[validWorkspaceId] = mockWorkspace;

      strategy = createStrategy();

      await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
        new AuthException(
          'Impersonation tokens are no longer accepted',
          AuthExceptionCode.FORBIDDEN_EXCEPTION,
        ),
      );
    });
  });

  describe('PLAYGROUND token validation', () => {
    // PLAYGROUND tokens are access-shaped but must never impersonate.
    it('ignores isImpersonating and resolves first-person', async () => {
      const validUserId = 'valid-user-id';
      const validUserWorkspaceId = randomUUID();
      const validWorkspaceId = randomUUID();

      const payload = {
        sub: validUserId,
        type: JwtTokenTypeEnum.PLAYGROUND,
        userWorkspaceId: validUserWorkspaceId,
        workspaceId: validWorkspaceId,
        isImpersonating: true,
      };

      workspaceStore[validWorkspaceId] = new WorkspaceEntity();
      userStore[validUserId] = { id: validUserId, lastName: 'lastNameDefault' };

      coreEntityCacheService.get.mockImplementation(
        async (keyName: string, entityId: string) => {
          if (keyName === 'workspaceEntity') {
            return workspaceStore[entityId] ?? null;
          }

          if (keyName === 'user') {
            return userStore[entityId] ?? null;
          }

          if (keyName === 'userWorkspaceEntity') {
            return {
              id: validUserWorkspaceId,
              user: { id: validUserId, lastName: 'lastNameDefault' },
              workspace: { id: validWorkspaceId },
            };
          }

          return null;
        },
      );

      strategy = createStrategy();

      const result = await strategy.validate(payload as JwtPayload);

      expect(result.impersonationContext).toBeUndefined();
      expect(result.tokenType).toBe(JwtTokenTypeEnum.PLAYGROUND);
      expect(result.userWorkspaceId).toBe(validUserWorkspaceId);
    });
  });
});
