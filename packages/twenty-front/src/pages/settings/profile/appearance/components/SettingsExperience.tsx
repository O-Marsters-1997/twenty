
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { FormatPreferencesSettings } from '@/settings/experience/components/FormatPreferencesSettings';
import { OpenRecordInPreferencePicker } from '@/settings/experience/components/OpenRecordInPreferencePicker';
import { UiScalePicker } from '@/settings/experience/components/UiScalePicker';
import { Trans, useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { SettingsAppearance } from '~/pages/settings/profile/appearance/components/SettingsAppearance';
import { LocalePicker } from '~/pages/settings/profile/appearance/components/LocalePicker';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  interfaceControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
  },
});

export const SettingsExperience = () => {
  const { t } = useLingui();

  return (
    <SettingsPageLayout
      title={t`Experience`}
      links={[
        {
          children: <Trans>User</Trans>,
          href: getSettingsPath(SettingsPath.ProfilePage),
        },
        { children: <Trans>Experience</Trans> },
      ]}
    >
      <SettingsPageContainer>
        <SettingsAppearance />

        <Section.Root>
          <Section.Header
            title={t`Interface`}
            description={t`Select your language and adjust the size of the interface`}
          />
          <div {...stylex.props(styles.interfaceControls)}>
            <LocalePicker />
            <UiScalePicker />
          </div>
        </Section.Root>

        <Section.Root>
          <Section.Header
            title={t`Navigation`}
            description={t`Choose where records open by default. Some objects may use a workspace setting`}
          />
          <OpenRecordInPreferencePicker />
        </Section.Root>

        <Section.Root>
          <Section.Header
            title={t`Formats`}
            description={t`Configure date, time, number, timezone, and calendar start day`}
          />
          <FormatPreferencesSettings />
        </Section.Root>
        {/* Unified into FormatPreferencesSettings */}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
