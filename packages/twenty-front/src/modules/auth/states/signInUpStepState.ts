import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
export enum SignInUpStep {
  Init = 'init',
  Email = 'email',
  Password = 'password',
  EmailVerification = 'emailVerification',
  WorkspaceSelection = 'workspaceSelection',
  WorkspaceCreation = 'workspaceCreation',
  TwoFactorAuthenticationVerification = 'TwoFactorAuthenticationVerification',
  TwoFactorAuthenticationProvision = 'TwoFactorAuthenticationProvision',
  TwoFactorAuthenticationRecovery = 'TwoFactorAuthenticationRecovery',
}

export const signInUpStepState = createAtomState<SignInUpStep>({
  key: 'signInUpStepState',
  defaultValue: SignInUpStep.Init,
});
