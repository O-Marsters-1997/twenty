import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { msg } from '@lingui/core/macro';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository, type QueryRunner } from 'typeorm';

import { EventLogEmitterService } from 'src/engine/core-modules/event-logs/emit/event-log-emitter.service';
import { USER_SIGNUP_EVENT } from 'src/engine/core-modules/event-logs/emit/events/workspace-event/user/user-signup';
import { type AppTokenEntity } from 'src/engine/core-modules/app-token/app-token.entity';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import {
  PASSWORD_REGEX,
  hashPassword,
} from 'src/engine/core-modules/auth/auth.util';
import { getSignUpWithoutWorkspaceDecision } from 'src/engine/core-modules/auth/utils/get-sign-up-without-workspace-decision.util';
import { hasProvisionedSignUpDestination } from 'src/engine/core-modules/auth/utils/has-provisioned-sign-up-destination.util';
import {
  type AuthProviderWithPasswordType,
  type ExistingUserOrPartialUserWithPicture,
  type PartialUserWithPicture,
  type SignInUpBaseParams,
  type SignInUpNewUserPayload,
} from 'src/engine/core-modules/auth/types/sign-in-up.type';
import { OnboardingService } from 'src/engine/core-modules/onboarding/onboarding.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { UserService } from 'src/engine/core-modules/user/services/user.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceInvitationService } from 'src/engine/core-modules/workspace-invitation/services/workspace-invitation.service';
import { PINNED_WORKSPACE_ID } from 'src/engine/core-modules/workspace/constants/pinned-workspace-id.constant';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

@Injectable()
// oxlint-disable-next-line twenty/inject-workspace-repository
export class SignInUpService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly workspaceInvitationService: WorkspaceInvitationService,
    private readonly userWorkspaceService: UserWorkspaceService,
    private readonly onboardingService: OnboardingService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly userService: UserService,
    private readonly eventLogEmitterService: EventLogEmitterService,
  ) {}

  async computePartialUserFromUserPayload(
    newUserPayload: SignInUpNewUserPayload,
    authParams: AuthProviderWithPasswordType['authParams'],
  ): Promise<PartialUserWithPicture> {
    if (!newUserPayload?.email) {
      throw new AuthException(
        'Email is required',
        AuthExceptionCode.INVALID_INPUT,
        {
          userFriendlyMessage: msg`Email is required`,
        },
      );
    }

    const partialNewUser: PartialUserWithPicture = {
      email: newUserPayload.email,
      firstName: newUserPayload.firstName ?? '',
      lastName: newUserPayload.lastName ?? '',
      picture: newUserPayload.picture ?? '',
      locale: newUserPayload.locale ?? 'en',
      isEmailVerified: newUserPayload.isEmailAlreadyVerified,
    };

    if (authParams.provider === AuthProviderEnum.Password) {
      partialNewUser.passwordHash = await this.generateHash(
        authParams.password,
      );
    }

    return partialNewUser;
  }

  async signInUp(
    params: SignInUpBaseParams &
      ExistingUserOrPartialUserWithPicture &
      AuthProviderWithPasswordType,
  ) {
    if (params.workspace && params.invitation) {
      return {
        workspace: params.workspace,
        user: await this.signInUpWithPersonalInvitation({
          invitation: params.invitation,
          userData: params.userData,
        }),
      };
    }

    if (params.workspace) {
      const updatedUser = await this.signInUpOnExistingWorkspace({
        workspace: params.workspace,
        userData: params.userData,
      });

      return { user: updatedUser, workspace: params.workspace };
    }

    return await this.signUpOnPinnedWorkspace(params.userData);
  }

  async generateHash(password: string) {
    const isPasswordValid = PASSWORD_REGEX.test(password);

    if (!isPasswordValid) {
      throw new AuthException(
        'Password too weak',
        AuthExceptionCode.INVALID_INPUT,
        {
          userFriendlyMessage: msg`Password too weak`,
        },
      );
    }

    return await hashPassword(password);
  }

  private async signInUpWithPersonalInvitation(
    params: {
      invitation: AppTokenEntity;
    } & ExistingUserOrPartialUserWithPicture,
  ) {
    if (!params.invitation) {
      throw new AuthException(
        'Invitation not found',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    }

    const email =
      params.userData.type === 'newUserWithPicture'
        ? params.userData.newUserWithPicture.email
        : params.userData.existingUser.email;

    if (!email) {
      throw new AuthException(
        'Email is required',
        AuthExceptionCode.INVALID_INPUT,
        {
          userFriendlyMessage: msg`Email is required`,
        },
      );
    }

    const invitationValidation =
      await this.workspaceInvitationService.validatePersonalInvitation({
        workspacePersonalInviteToken: params.invitation.value,
        email,
      });

    if (!invitationValidation?.isValid) {
      throw new AuthException(
        'Invitation not found',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    }

    const updatedUser = await this.signInUpOnExistingWorkspace({
      workspace: invitationValidation.workspace,
      userData: params.userData,
      roleId: params.invitation.context?.roleId,
    });

    await this.workspaceInvitationService.invalidateWorkspaceInvitation(
      invitationValidation.workspace.id,
      email,
    );

    await this.userService.markEmailAsVerified(updatedUser.id);

    return updatedUser;
  }

  private async throwIfWorkspaceIsNotReadyForSignInUp(
    workspace: WorkspaceEntity,
    user: ExistingUserOrPartialUserWithPicture,
  ) {
    if (
      workspace.activationStatus === WorkspaceActivationStatus.ACTIVE ||
      workspace.activationStatus === WorkspaceActivationStatus.CREATED
    ) {
      return;
    }

    if (user.userData.type !== 'existingUser') {
      throw new AuthException(
        'Workspace is not ready to welcome new members',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
        {
          userFriendlyMessage: msg`Workspace is not ready to welcome new members`,
        },
      );
    }

    const userWorkspaceExists =
      await this.userWorkspaceService.checkUserWorkspaceExists(
        user.userData.existingUser.id,
        workspace.id,
      );

    if (!userWorkspaceExists) {
      throw new AuthException(
        'Workspace is not ready to welcome new members',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
        {
          userFriendlyMessage: msg`Workspace is not ready to welcome new members`,
        },
      );
    }
  }

  async signInUpOnExistingWorkspace(
    params: {
      workspace: WorkspaceEntity;
      roleId?: string | null;
    } & ExistingUserOrPartialUserWithPicture,
  ) {
    await this.throwIfWorkspaceIsNotReadyForSignInUp(params.workspace, params);

    const isNewUser = params.userData.type === 'newUserWithPicture';

    if (isNewUser) {
      const userData = params.userData as {
        type: 'newUserWithPicture';
        newUserWithPicture: PartialUserWithPicture;
      };

      const user = await this.saveNewUser(userData.newUserWithPicture);

      await this.activateOnboardingForUser({
        user,
        workspace: params.workspace,
        shouldShowConnectAccountStep: true,
      });

      await this.userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace(
        user,
        params.workspace,
        params.roleId,
      );

      return user;
    }

    const userData = params.userData as {
      type: 'existingUser';
      existingUser: UserEntity;
    };

    const user = userData.existingUser;

    await this.userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace(
      user,
      params.workspace,
      params.roleId,
    );

    return user;
  }

  private async activateOnboardingForUser(
    {
      user,
      workspace,
      shouldShowConnectAccountStep,
    }: {
      user: Pick<UserEntity, 'id' | 'firstName' | 'lastName'>;
      workspace: WorkspaceEntity;
      shouldShowConnectAccountStep: boolean;
    },
    queryRunner?: QueryRunner,
  ) {
    if (shouldShowConnectAccountStep) {
      await this.onboardingService.setOnboardingConnectAccountPending(
        {
          userId: user.id,
          workspaceId: workspace.id,
          value: true,
        },
        queryRunner,
      );
    }

    await this.onboardingService.setOnboardingCreateProfilePending(
      {
        userId: user.id,
        workspaceId: workspace.id,
        value: true,
      },
      queryRunner,
    );
  }

  private async saveNewUser(newUserWithPicture: PartialUserWithPicture) {
    const savedUser = await this.userRepository.save(
      this.userRepository.create(newUserWithPicture),
    );

    void this.eventLogEmitterService
      .createContext({
        workspaceId: savedUser.currentWorkspace?.id,
        userId: savedUser.id,
      })
      .insertWorkspaceEvent(USER_SIGNUP_EVENT, {});
    return savedUser;
  }

  // Enforced at sign-up so a restricted instance stops accumulating users who can never reach a workspace
  private async assertSignUpWithoutWorkspaceAllowed(
    email: string,
  ): Promise<void> {
    const decision = getSignUpWithoutWorkspaceDecision({
      isMultiWorkspaceEnabled: this.twentyConfigService.get(
        'IS_MULTIWORKSPACE_ENABLED',
      ),
      isWorkspaceCreationLimitedToServerAdmins: this.twentyConfigService.get(
        'IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS',
      ),
      workspaceCount:
        (await this.userWorkspaceService.getUserCount(PINNED_WORKSPACE_ID)) ??
        0,
    });

    if (decision === 'allowed') {
      return;
    }

    if (
      decision === 'requiresDestination' &&
      (await this.hasProvisionedDestination(email))
    ) {
      return;
    }

    throw new AuthException(
      'New workspace setup is disabled',
      AuthExceptionCode.SIGNUP_DISABLED,
    );
  }

  private async hasProvisionedDestination(email: string): Promise<boolean> {
    // Read directly: the sign-in picker hides HIDDEN workspaces, which is only a listing rule
    const invitations =
      await this.workspaceInvitationService.findInvitationsByEmail(email);

    if (hasProvisionedSignUpDestination(invitations)) {
      return true;
    }

    const { availableWorkspacesForSignUp } =
      await this.userWorkspaceService.findAvailableWorkspacesByEmail(email);

    return hasProvisionedSignUpDestination(availableWorkspacesForSignUp);
  }

  async signUpOnPinnedWorkspace(
    userData: ExistingUserOrPartialUserWithPicture['userData'],
  ) {
    const workspace = await this.workspaceRepository.findOneByOrFail({
      id: PINNED_WORKSPACE_ID,
    });

    const user =
      userData.type === 'existingUser'
        ? userData.existingUser
        : await this.saveNewUser(userData.newUserWithPicture);

    if (
      await this.userWorkspaceService.checkUserWorkspaceExists(
        user.id,
        workspace.id,
      )
    ) {
      return { user, workspace };
    }

    const memberCount =
      (await this.userWorkspaceService.getUserCount(workspace.id)) ?? 0;

    if (memberCount > 0) {
      throw new AuthException(
        'The workspace already has an owner',
        AuthExceptionCode.SIGNUP_DISABLED,
      );
    }

    const adminRole = await this.roleRepository.findOneByOrFail({
      workspaceId: workspace.id,
      universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
    });

    await this.userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace(
      user,
      workspace,
      adminRole.id,
    );

    await this.activateOnboardingForUser({
      user,
      workspace,
      shouldShowConnectAccountStep: true,
    });

    return { user, workspace };
  }

  async signUpWithoutWorkspace(
    newUserParams: SignInUpNewUserPayload,
    authParams: AuthProviderWithPasswordType['authParams'],
  ) {
    const userExists = await this.userService.findUserByEmail(
      newUserParams.email,
    );

    if (userExists) {
      throw new AuthException(
        'User already exists',
        AuthExceptionCode.USER_ALREADY_EXISTS,
        { userFriendlyMessage: msg`User already exists` },
      );
    }

    await this.assertSignUpWithoutWorkspaceAllowed(newUserParams.email);

    return this.saveNewUser(
      await this.computePartialUserFromUserPayload(newUserParams, authParams),
    );
  }
}
