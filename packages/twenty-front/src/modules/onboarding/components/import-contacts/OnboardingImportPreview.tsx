import { OnboardingImportPreviewCompanies } from '@/onboarding/components/import-contacts/OnboardingImportPreviewCompanies';
import { OnboardingImportPreviewEmails } from '@/onboarding/components/import-contacts/OnboardingImportPreviewEmails';
import { OnboardingImportPreviewSyncBadge } from '@/onboarding/components/import-contacts/OnboardingImportPreviewSyncBadge';
import { OnboardingImportPrivacyNote } from '@/onboarding/components/import-contacts/OnboardingImportPrivacyNote';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { onboardingLayout } from '../../constants/onboardingLayout.stylex';

const PREVIEW_HEIGHT = 198;

const styles = stylex.create({
  card: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: '12px',
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-3'],
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    paddingBottom: `calc(${spacing['--t-spacing-3']} - 1px)`,
    width: onboardingLayout.contentBlockWidth,
  },
  columns: {
    gap: '1px',
    backgroundColor: borderColor['--t-border-color-medium'],
    display: 'flex',
    position: 'relative',
    height: `${PREVIEW_HEIGHT}px`,
    width: '100%',
  },
});

export const OnboardingImportPreview = () => (
  <div {...stylex.props(styles.card)}>
    <div {...stylex.props(styles.columns)}>
      <OnboardingImportPreviewEmails />
      <OnboardingImportPreviewCompanies />
      <OnboardingImportPreviewSyncBadge />
    </div>
    <OnboardingImportPrivacyNote />
  </div>
);
