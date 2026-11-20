import { useLingui } from '@lingui/react/macro';

import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsDiscoveryHeroCard } from '@/settings/components/SettingsDiscoveryHeroCard';
import { ClickTrackingSwitch } from '@/settings/workspace/components/ClickTrackingSwitch';
import { OpenTrackingSwitch } from '@/settings/workspace/components/OpenTrackingSwitch';
import { SettingsWorkspaceBlocklistSection } from '@/settings/workspace/components/SettingsWorkspaceBlocklistSection';
import { SettingsWorkspaceEmailGroupSection } from '@/settings/workspace/components/SettingsWorkspaceEmailGroupSection';
import { SettingsWorkspaceEmailSyncSection } from '@/settings/workspace/components/SettingsWorkspaceEmailSyncSection';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey, SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { IconMailX } from 'twenty-ui/icon';
import coverDark from '~/pages/settings/communications/assets/cover-dark.png';
import coverLight from '~/pages/settings/communications/assets/cover-light.png';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { useTheme } from 'twenty-ui/theme';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  cardsColumn: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
});

export const SettingsWorkspaceCommunications = () => {
  const theme = useTheme();

  const { t } = useLingui();

  const navigateSettings = useNavigateSettings();

  const isMessageCampaignFeatureEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
  );

  return (
    <SettingsPageLayout
      title={t`Communication`}
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        { children: t`Communication` },
      ]}
    >
      <SettingsPageContainer>
        <Section.Root>
          <SettingsDiscoveryHeroCard
            lightSrc={coverLight}
            darkSrc={coverDark}
            instanceIdPrefix="settings-communications-hero"
            tabs={[]}
          />
        </Section.Root>
        <SettingsWorkspaceEmailGroupSection />
        {isMessageCampaignFeatureEnabled && (
          <Section.Root>
            <Section.Header
              title={t`Tracking`}
              description={t`Measure engagement on the campaigns this workspace sends`}
            />
            <div {...stylex.props(styles.cardsColumn)}>
              <ClickTrackingSwitch />
              <OpenTrackingSwitch />
            </div>
          </Section.Root>
        )}
        {isMessageCampaignFeatureEnabled && (
          <Section.Root>
            <Section.Header
              title={t`Unsubscribe`}
              description={t`Manage unsubscribers, opt-out topics, and the page recipients see`}
            />
            <div {...stylex.props(styles.cardsColumn)}>
              <SettingsCard
                Icon={
                  <IconMailX
                    size={theme.icon.size.lg}
                    stroke={theme.icon.stroke.md}
                  />
                }
                title={t`Manage unsubscribe`}
                onClick={() => navigateSettings(SettingsPath.Unsubscribe)}
              />
            </div>
          </Section.Root>
        )}
        <SettingsWorkspaceEmailSyncSection />
        <SettingsWorkspaceBlocklistSection />
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
