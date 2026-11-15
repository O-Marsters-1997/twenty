import { onboardingLayout } from '../../../../onboarding/constants/onboardingLayout.stylex';
import { useSignUpInNewWorkspace } from '@/auth/sign-in-up/hooks/useSignUpInNewWorkspace';
import { useWorkspaceSubdomainField } from '@/auth/sign-in-up/hooks/useWorkspaceSubdomainField';
import { isCreatingWorkspaceState } from '@/auth/states/isCreatingWorkspaceState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { OnboardingAnimatedReveal } from '@/onboarding/components/OnboardingAnimatedReveal';
import { OnboardingStepAnimatedItem } from '@/onboarding/components/OnboardingStepAnimatedItem';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { TextInput } from '@/ui/input/components/TextInput';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { getWorkspaceAvatarColorSeed } from '@/workspace/utils/getWorkspaceAvatarColorSeed';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useEffect, useRef, useState } from 'react';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton, MainButton } from 'twenty-ui/components/input';
import { IconTrash, IconUpload } from 'twenty-ui/icon';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, borderColor, borderRadius, color, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-14'],
    maxWidth: '100%',
    width: onboardingLayout.contentBlockWidth,
  },
  heading: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xl'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    lineHeight: '1.2',
  },
  subtitle: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: '1.4',
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-8'],
    paddingBottom: spacing['--t-spacing-4'],
    width: '100%',
  },
  logoRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  logoButtons: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-0_5'],
  },
  hiddenFileInput: {
    display: 'none',
  },
  subdomainSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    width: '100%',
  },
  alternativesBox: {
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  alternativesLabel: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    paddingBottom: spacing['--t-spacing-1'],
  },
  alternativeRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
  },
  alternativeRow: {
    alignItems: 'center',
    background: 'transparent',
    borderStyle: 'none',
    color: color['--t-color-green'],
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    gap: spacing['--t-spacing-1'],
    paddingTop: '2px',
    paddingRight: '0',
    paddingBottom: '2px',
    paddingLeft: '0',
    textAlign: 'left',
  },
  availabilityDotBox: {
    display: 'flex',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  availabilityDot: {
    backgroundColor: color['--t-color-green'],
    borderTopLeftRadius: '50%',
    borderTopRightRadius: '50%',
    borderBottomRightRadius: '50%',
    borderBottomLeftRadius: '50%',
    boxShadow: `0 0 0 3px ${color['--t-color-green5']}`,
    cornerShape: 'round',
    flexShrink: '0',
    height: '6px',
    width: '6px',
  },
});

const StyledLogoAvatar = styled(Avatar)`
  height: ${themeCssVariables.spacing[8]};
  width: ${themeCssVariables.spacing[8]};
`;

export const SignInUpWorkspaceCreationForm = () => {
  const { t } = useLingui();
  const { createWorkspace } = useSignUpInNewWorkspace();
  const { frontDomain } = useAtomStateValue(domainConfigurationState);
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );

  const isCreatingWorkspace = useAtomStateValue(isCreatingWorkspaceState);
  const setIsCreatingWorkspace = useSetAtomState(isCreatingWorkspaceState);
  const [logo, setLogo] = useState<File | undefined>(undefined);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | undefined>(
    undefined,
  );
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  const {
    workspaceName,
    subdomain,
    status,
    errorMessage,
    suggestions,
    isAvailable,
    handleWorkspaceNameChange,
    handleSubdomainChange,
    applySuggestionValue,
  } = useWorkspaceSubdomainField({
    isSubdomainEnabled: isMultiWorkspaceEnabled,
  });

  const isContinueDisabled =
    workspaceName.trim() === '' ||
    isCreatingWorkspace ||
    (isMultiWorkspaceEnabled && !isAvailable);

  const openFilePicker = () => {
    hiddenFileInputRef.current?.click();
  };

  const handleLogoUpload = (file: File) => {
    if (!isDefined(file)) {
      return;
    }
    setLogo(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleLogoRemove = () => {
    setLogo(undefined);
    setLogoPreviewUrl(undefined);
  };

  useEffect(() => {
    if (!isDefined(logoPreviewUrl)) {
      return;
    }

    return () => {
      URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const handleSubmit = async () => {
    if (isContinueDisabled) {
      return;
    }

    setIsCreatingWorkspace(true);

    const isWorkspaceCreated = await createWorkspace({
      displayName: workspaceName.trim(),
      ...(isMultiWorkspaceEnabled ? { subdomain } : {}),
      logo,
    });

    if (!isWorkspaceCreated) {
      setIsCreatingWorkspace(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return;
    }
    if (event.key === Key.Enter) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const subdomainError =
    status === 'invalid'
      ? errorMessage
      : status === 'unavailable'
        ? t`This address is already taken`
        : status === 'error'
          ? t`Couldn't check availability. Please try again.`
          : undefined;

  return (
    <div {...stylex.props(styles.contentContainer)}>
      <div {...stylex.props(styles.heading)}>
        <OnboardingStepAnimatedItem index={0}>
          <div {...stylex.props(styles.title)}>{t`Create your workspace`}</div>
        </OnboardingStepAnimatedItem>
        <OnboardingStepAnimatedItem index={1}>
          <div {...stylex.props(styles.subtitle)}>
            {t`Move work forward across teams and agents`}
          </div>
        </OnboardingStepAnimatedItem>
      </div>
      <div {...stylex.props(styles.formSection)}>
        <OnboardingStepAnimatedItem index={2}>
          <div {...stylex.props(styles.logoRow)}>
            <StyledLogoAvatar
              src={logoPreviewUrl}
              name={isNonEmptyString(workspaceName) ? workspaceName : '?'}
              colorSeed={getWorkspaceAvatarColorSeed(workspaceName)}
              shape="square"
              size="xl"
              render={
                <button
                  type="button"
                  aria-label={t`Upload logo`}
                  onClick={openFilePicker}
                />
              }
            />
            <input
              type="file"
              ref={hiddenFileInputRef}
              accept="image/jpeg, image/png, image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (isDefined(file)) {
                  handleLogoUpload(file);
                }
                event.target.value = '';
              }} {...stylex.props(styles.hiddenFileInput)}
            />
            <div {...stylex.props(styles.logoButtons)}>
              <Button
                startIcon={<IconUpload />}
                onClick={openFilePicker}
                variant="outline"
              >{t`Upload logo`}</Button>
              <LightIconButton
                emphasis="subtle"
                size="md"
                onClick={handleLogoRemove}
                disabled={!isDefined(logoPreviewUrl)}
                aria-label={t`Remove logo`}
              >
                <IconTrash />
              </LightIconButton>
            </div>
          </div>
        </OnboardingStepAnimatedItem>
        <OnboardingStepAnimatedItem index={3}>
          <TextInput
            autoFocus
            label={t`Name`}
            value={workspaceName}
            placeholder={t`Apple`}
            onChange={handleWorkspaceNameChange}
            onKeyDown={handleKeyDown}
            fullWidth
          />
        </OnboardingStepAnimatedItem>
        {isMultiWorkspaceEnabled && (
          <OnboardingStepAnimatedItem index={4}>
            <div {...stylex.props(styles.subdomainSection)}>
              <TextInput
                label={t`Subdomain`}
                value={subdomain}
                placeholder={t`apple`}
                onChange={handleSubdomainChange}
                onKeyDown={handleKeyDown}
                rightAdornment={
                  isNonEmptyString(frontDomain) ? `.${frontDomain}` : undefined
                }
                error={subdomainError}
                noErrorHelper={
                  status === 'unavailable' || !isDefined(subdomainError)
                }
                fullWidth
              />
              <OnboardingAnimatedReveal isVisible={status === 'unavailable'}>
                <div {...stylex.props(styles.alternativesBox)}>
                  <span {...stylex.props(styles.alternativesLabel)}>
                    {t`Subdomain already in use, here are some alternatives:`}
                  </span>
                  <div {...stylex.props(styles.alternativeRows)}>
                    {suggestions.map((alternative) => (
                      <button
                        key={alternative}
                        type="button"
                        onClick={() => applySuggestionValue(alternative)} {...stylex.props(styles.alternativeRow)}
                      >
                        <div {...stylex.props(styles.availabilityDotBox)}>
                          <div {...stylex.props(styles.availabilityDot)} />
                        </div>
                        {alternative}
                      </button>
                    ))}
                  </div>
                </div>
              </OnboardingAnimatedReveal>
            </div>
          </OnboardingStepAnimatedItem>
        )}
      </div>
      <OnboardingStepAnimatedItem index={isMultiWorkspaceEnabled ? 5 : 4}>
        <MainButton
          onClick={handleSubmit}
          disabled={isContinueDisabled}
          fullWidth
        >{t`Create workspace`}</MainButton>
      </OnboardingStepAnimatedItem>
    </div>
  );
};
