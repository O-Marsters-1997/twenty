import { onboardingLayout } from '../../modules/onboarding/constants/onboardingLayout.stylex';
import { OnboardingMainButton } from '@/onboarding/components/OnboardingMainButton';
import { type OnboardingAction } from '@/onboarding/types/OnboardingAction';
import { OnboardingSkipButton } from '@/onboarding/components/OnboardingSkipButton';
import { OnboardingStepAnimatedItem } from '@/onboarding/components/OnboardingStepAnimatedItem';
import { StyledOnboardingStepHeading } from '@/onboarding/components/StyledOnboardingStepHeading';
import { StyledOnboardingStepPage } from '@/onboarding/components/StyledOnboardingStepPage';
import { StyledOnboardingStepSubtitle } from '@/onboarding/components/StyledOnboardingStepSubtitle';
import { StyledOnboardingStepTitle } from '@/onboarding/components/StyledOnboardingStepTitle';
import { OnboardingImportPreview } from '@/onboarding/components/import-contacts/OnboardingImportPreview';
import { OnboardingTrustBadges } from '@/onboarding/components/import-contacts/OnboardingTrustBadges';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const StyledOnboardingStep = styled(StyledOnboardingStepPage)`
  gap: ${themeCssVariables.spacing[8]};
`;

const StyledSubtitle = styled(StyledOnboardingStepSubtitle)`
  max-width: 100%;
  width: 320px;
`;

const styles = stylex.create({
  footer: {
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    maxWidth: '100%',
    width: onboardingLayout.contentBlockWidth,
  },
  middle: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    width: '100%',
  },
});

type ImportContactsProps = {
  providerActions: OnboardingAction[];
  onSkip?: () => void;
};

export const ImportContacts = ({
  providerActions,
  onSkip,
}: ImportContactsProps) => {
  const { t } = useLingui();

  return (
    <StyledOnboardingStep data-testid="onboarding-sync-emails-step">
      <StyledOnboardingStepHeading>
        <OnboardingStepAnimatedItem index={0}>
          <StyledOnboardingStepTitle>{t`Import your contacts`}</StyledOnboardingStepTitle>
        </OnboardingStepAnimatedItem>
        <OnboardingStepAnimatedItem index={1}>
          <StyledSubtitle>
            {t`Connect your email and calendar to see your entire network instantly. Takes only 30 seconds.`}
          </StyledSubtitle>
        </OnboardingStepAnimatedItem>
      </StyledOnboardingStepHeading>

      <OnboardingStepAnimatedItem index={2}>
        <div {...stylex.props(styles.middle)}>
          <OnboardingTrustBadges />
          <OnboardingImportPreview />
        </div>
      </OnboardingStepAnimatedItem>

      <OnboardingStepAnimatedItem index={3}>
        <div {...stylex.props(styles.footer)}>
          <div {...stylex.props(styles.buttons)}>
            {providerActions.map((providerAction) => (
              <OnboardingMainButton
                key={providerAction.label}
                label={providerAction.label}
                Icon={providerAction.Icon}
                onClick={providerAction.onClick}
              />
            ))}
          </div>
          {isDefined(onSkip) && <OnboardingSkipButton onClick={onSkip} />}
        </div>
      </OnboardingStepAnimatedItem>
    </StyledOnboardingStep>
  );
};
