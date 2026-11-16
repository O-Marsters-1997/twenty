import { availableWorkspacesState } from '@/auth/states/availableWorkspacesState';
import { returnToPathState } from '@/auth/states/returnToPathState';
import { useBuildWorkspaceUrl } from '@/domain-manager/hooks/useBuildWorkspaceUrl';
import { UndecoratedLink } from '@/ui/navigation/link/components/UndecoratedLink/UndecoratedLink';
import { useQuery } from '@apollo/client/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { FormProvider } from 'react-hook-form';
import { Button } from 'twenty-ui/primitives/input';

import { StyledOnboardingContentContainer } from '@/auth/components/StyledOnboardingContentContainer';
import { SignInUpWithCredentials } from '@/auth/sign-in-up/components/internal/SignInUpWithCredentials';
import { SignInUpWithGoogle } from '@/auth/sign-in-up/components/internal/SignInUpWithGoogle';
import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { useSignInUpForm } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { getAvailableWorkspacePathAndSearchParams } from '@/auth/utils/availableWorkspacesUtils';
import { authProvidersState } from '@/client-config/states/authProvidersState';
import { isDDLLockedState } from '@/client-config/states/isDDLLockedState';
import { OnboardingStepAnimatedItem } from '@/onboarding/components/OnboardingStepAnimatedItem';
import { DEFAULT_WORKSPACE_LOGO } from '@/ui/navigation/navigation-drawer/constants/DefaultWorkspaceLogo';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { getWorkspaceAvatarColorSeed } from '@/workspace/utils/getWorkspaceAvatarColorSeed';
import { isNonEmptyString } from '@sniptt/guards';
import { IconChevronRight, IconPlus } from 'twenty-ui/icon';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { Separator } from 'twenty-ui/primitives/layout';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import {
  type AvailableWorkspace,
  GetWorkspaceCreationDefaultsDocument,
} from '~/generated-metadata/graphql';
import { getWorkspaceUrl } from '~/utils/getWorkspaceUrl';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  workspaceContainer: {
    backgroundColor: background['--t-background-primary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    borderRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: '100%',
  },
  workspaceRow: {
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: { default: '1px', ':last-child': '0' },
  },
  workspaceItem: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    height: spacing['--t-spacing-15'],
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    width: '100%',
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderBottomStyle: { default: null, ':last-child': 'none' },
  },
  workspaceContent: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-4'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-4'],
    width: '100%',
  },
  workspaceTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: '1',
  },
  workspaceLogo: {
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    height: spacing['--t-spacing-6'],
    justifyContent: 'center',
    width: spacing['--t-spacing-6'],
  },
  workspaceName: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    paddingBottom: spacing['--t-spacing-1'],
  },
  workspaceUrl: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
  },
  chevronIcon: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
  },
  forgotPasswordLinkContainer: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-4'],
  },
});

export const SignInUpGlobalScopeForm = () => {
  const theme = useTheme();
  const authProviders = useAtomStateValue(authProvidersState);
  const isDDLLocked = useAtomStateValue(isDDLLockedState);
  const signInUpStep = useAtomStateValue(signInUpStepState);
  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const { buildWorkspaceUrl } = useBuildWorkspaceUrl();
  const availableWorkspaces = useAtomStateValue(availableWorkspacesState);
  const { t } = useLingui();

  const { form } = useSignInUpForm();
  const { handleResetPassword } = useHandleResetPassword();
  const returnToPath = useAtomStateValue(returnToPathState);

  useQuery(GetWorkspaceCreationDefaultsDocument, {
    skip: signInUpStep !== SignInUpStep.WorkspaceSelection,
  });

  const getAvailableWorkspaceUrl = (availableWorkspace: AvailableWorkspace) => {
    const { pathname, searchParams } = getAvailableWorkspacePathAndSearchParams(
      availableWorkspace,
      { email: form.getValues('email') },
    );

    return buildWorkspaceUrl(
      getWorkspaceUrl(availableWorkspace.workspaceUrls),
      pathname,
      {
        ...searchParams,
        ...(isNonEmptyString(returnToPath) ? { returnToPath } : {}),
      },
    );
  };

  const availableWorkspacesList = [
    ...availableWorkspaces.availableWorkspacesForSignIn,
    ...availableWorkspaces.availableWorkspacesForSignUp,
  ];

  return (
    <>
      {signInUpStep === SignInUpStep.WorkspaceSelection && (
        <StyledOnboardingContentContainer>
          <div {...stylex.props(styles.workspaceContainer)}>
            {availableWorkspacesList.map((availableWorkspace, index) => (
              <OnboardingStepAnimatedItem
                key={availableWorkspace.id}
                index={index}
                xstyle={styles.workspaceRow}
              >
                <UndecoratedLink
                  to={getAvailableWorkspaceUrl(availableWorkspace)}
                >
                  <div {...stylex.props(styles.workspaceItem)}>
                    <div {...stylex.props(styles.workspaceContent)}>
                      <Avatar
                        name={availableWorkspace.displayName || ''}
                        colorSeed={getWorkspaceAvatarColorSeed(
                          availableWorkspace.displayName,
                        )}
                        src={getAbsoluteImageUrl(
                          availableWorkspace.logo ?? DEFAULT_WORKSPACE_LOGO,
                        )}
                        size="lg"
                      />
                      <div {...stylex.props(styles.workspaceTextContainer)}>
                        <div {...stylex.props(styles.workspaceName)}>
                          {availableWorkspace.displayName ||
                            availableWorkspace.id}
                        </div>
                        <div {...stylex.props(styles.workspaceUrl)}>
                          {
                            new URL(
                              getWorkspaceUrl(availableWorkspace.workspaceUrls),
                            ).hostname
                          }
                        </div>
                      </div>
                      <div {...stylex.props(styles.chevronIcon)}>
                        <IconChevronRight size={theme.icon.size.md} />
                      </div>
                    </div>
                  </div>
                </UndecoratedLink>
              </OnboardingStepAnimatedItem>
            ))}
            {!isDDLLocked && (
              <OnboardingStepAnimatedItem
                index={availableWorkspacesList.length}
                xstyle={styles.workspaceRow}
              >
                <div
                  onClick={() =>
                    setSignInUpStep(SignInUpStep.WorkspaceCreation)
                  }
                  {...stylex.props(styles.workspaceItem)}
                >
                  <div {...stylex.props(styles.workspaceContent)}>
                    <div {...stylex.props(styles.workspaceLogo)}>
                      <IconPlus size={theme.icon.size.lg} />
                    </div>
                    <div {...stylex.props(styles.workspaceTextContainer)}>
                      <div
                        {...stylex.props(styles.workspaceName)}
                      >{t`Create a workspace`}</div>
                    </div>
                    <div {...stylex.props(styles.chevronIcon)}>
                      <IconChevronRight size={theme.icon.size.md} />
                    </div>
                  </div>
                </div>
              </OnboardingStepAnimatedItem>
            )}
          </div>
        </StyledOnboardingContentContainer>
      )}
      {signInUpStep !== SignInUpStep.WorkspaceSelection && (
        <StyledOnboardingContentContainer>
          {authProviders.google && (
            <SignInUpWithGoogle
              action="list-available-workspaces"
              isGlobalScope
            />
          )}
          {authProviders.google && (
            <Separator
              style={{
                backgroundColor: themeCssVariables.background.transparent.light,
                marginBlock: themeCssVariables.spacing[3],
              }}
            />
          )}
          {/* oxlint-disable-next-line react/jsx-props-no-spreading */}
          <FormProvider {...form}>
            <SignInUpWithCredentials isGlobalScope />
          </FormProvider>
          {signInUpStep === SignInUpStep.Password && (
            <div {...stylex.props(styles.forgotPasswordLinkContainer)}>
              <Button
                variant="link"
                onClick={handleResetPassword(form.getValues('email'))}
              >
                <Trans>Forgot your password?</Trans>
              </Button>
            </div>
          )}
        </StyledOnboardingContentContainer>
      )}
    </>
  );
};
