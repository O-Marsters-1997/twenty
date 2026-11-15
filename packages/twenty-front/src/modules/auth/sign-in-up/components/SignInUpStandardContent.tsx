import { Logo } from '@/auth/components/Logo';
import { StyledAuthContent } from '@/auth/components/StyledAuthContent';
import { Title } from '@/auth/components/Title';
import { AnimatedEaseIn } from '@/auth/components/internal/AnimatedEaseIn/AnimatedEaseIn';
import { FooterNote } from '@/auth/sign-in-up/components/FooterNote';
import { WorkspaceSelectionFooter } from '@/auth/sign-in-up/components/WorkspaceSelectionFooter';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { type JSX } from 'react';
import { AppPath } from 'twenty-shared/types';
import { type PublicWorkspaceData } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  titleContainer: {
    lineHeight: '1.2',
    marginTop: spacing['--t-spacing-10'],
  },
  formContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: spacing['--t-spacing-6'],
    marginTop: spacing['--t-spacing-6'],
    minWidth: '0',
    width: '100%',
  },
});

type SignInUpStandardContentProps = {
  workspacePublicData: PublicWorkspaceData | null;
  signInUpForm: JSX.Element | null;
  signInUpStep: SignInUpStep;
  title: string;
  onClickOnLogo: () => void;
};

export const SignInUpStandardContent = ({
  workspacePublicData,
  signInUpForm,
  signInUpStep,
  title,
  onClickOnLogo,
}: SignInUpStandardContentProps) => {
  return (
    <StyledAuthContent>
      <AnimatedEaseIn>
        <Logo
          secondaryLogo={workspacePublicData?.logo}
          placeholder={workspacePublicData?.displayName}
          onClick={onClickOnLogo}
          to={AppPath.SignInUp}
        />
      </AnimatedEaseIn>
      <div {...stylex.props(styles.titleContainer)}>
        <Title animate>{title}</Title>
      </div>
      <div {...stylex.props(styles.formContainer)}>{signInUpForm}</div>
      {signInUpStep === SignInUpStep.WorkspaceSelection && (
        <WorkspaceSelectionFooter />
      )}
      {![
        SignInUpStep.Password,
        SignInUpStep.TwoFactorAuthenticationProvision,
        SignInUpStep.TwoFactorAuthenticationVerification,
        SignInUpStep.TwoFactorAuthenticationRecovery,
        SignInUpStep.WorkspaceSelection,
        SignInUpStep.WorkspaceCreation,
      ].includes(signInUpStep) && (
        <FooterNote secondaryAgreement="dataProcessingAgreement" />
      )}
    </StyledAuthContent>
  );
};
