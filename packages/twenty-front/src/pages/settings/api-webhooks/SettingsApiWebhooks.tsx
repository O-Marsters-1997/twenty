import { NavigationButton } from '@/ui/input/components/NavigationButton';

import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsTabBar } from '@/settings/components/layout/SettingsTabBar';
import { useSettingsActiveTabId } from '@/settings/components/layout/useSettingsActiveTabId';
import { SettingsDiscoveryHeroCard } from '@/settings/components/SettingsDiscoveryHeroCard';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsApiKeysTable } from '@/settings/developers/components/SettingsApiKeysTable';
import { SettingsWebhooksTable } from '@/settings/developers/components/SettingsWebhooksTable';
import PlaygroundCoverDark from '@/settings/mcp-and-apis/assets/cover-dark.png';
import PlaygroundCoverLight from '@/settings/mcp-and-apis/assets/cover-light.png';
import McpCoverDark from '@/settings/mcp-and-apis/assets/mcp-cover-dark.png';
import McpCoverLight from '@/settings/mcp-and-apis/assets/mcp-cover-light.png';
import { PlaygroundSetupForm } from '@/settings/mcp-and-apis/components/PlaygroundSetupForm';
import { SettingsMcpSetup } from '@/settings/mcp-and-apis/components/SettingsMcpSetup';
import { useIsMobile } from 'twenty-ui/utilities';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import {
  IconApi,
  IconPlus,
  IconSparkle2,
  IconSparkles,
  IconWebhook,
} from 'twenty-ui/icon';
import { SETTINGS_API_WEBHOOKS_TABS } from '@/settings/developers/constants/SettingsApiWebhooksTabs';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

type TabKey =
  (typeof SETTINGS_API_WEBHOOKS_TABS.TABS_IDS)[keyof typeof SETTINGS_API_WEBHOOKS_TABS.TABS_IDS];

const SETTINGS_API_HERO_INSTANCE_ID_PREFIX = 'settings-api-hero';

const styles = stylex.create({
  tableContainer: {
    gap: spacing['--t-spacing-2'],
    overflow: 'visible',
    display: 'flex',
    flexDirection: 'column',
  },
  tableContainerMobile: {
    overflow: 'hidden',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: {
      default: spacing['--t-spacing-2'],
      [media.mobile]: spacing['--t-spacing-5'],
    },
  },
  tabContent: {
    gap: spacing['--t-spacing-10'],
    display: 'flex',
    flexDirection: 'column',
    paddingTop: spacing['--t-spacing-6'],
  },
});

export const SettingsApiWebhooks = () => {
  const isMobile = useIsMobile();
  const { t } = useLingui();

  const tabs = [
    {
      id: SETTINGS_API_WEBHOOKS_TABS.TABS_IDS.MCP,
      title: t`MCP`,
      Icon: IconSparkles,
    },
    {
      id: SETTINGS_API_WEBHOOKS_TABS.TABS_IDS.API,
      title: t`API`,
      Icon: IconApi,
    },
    {
      id: SETTINGS_API_WEBHOOKS_TABS.TABS_IDS.WEBHOOKS,
      title: t`Webhooks`,
      Icon: IconWebhook,
    },
  ];

  const activeTab: TabKey =
    (useSettingsActiveTabId(
      SETTINGS_API_WEBHOOKS_TABS.COMPONENT_INSTANCE_ID,
      tabs.map((tab) => tab.id),
    ) as TabKey) ?? SETTINGS_API_WEBHOOKS_TABS.TABS_IDS.MCP;

  const isMcpTab = activeTab === SETTINGS_API_WEBHOOKS_TABS.TABS_IDS.MCP;

  return (
    <SettingsPageLayout
      title={t`MCP & APIs`}
      secondaryBar={
        <SettingsTabBar
          aria-label={t`APIs and webhooks`}
          tabs={tabs}
          componentInstanceId={SETTINGS_API_WEBHOOKS_TABS.COMPONENT_INSTANCE_ID}
        />
      }
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        { children: t`MCP & APIs` },
      ]}
    >
      <SettingsPageContainer>
        <Section.Root>
          <SettingsDiscoveryHeroCard
            lightSrc={isMcpTab ? McpCoverLight : PlaygroundCoverLight}
            darkSrc={isMcpTab ? McpCoverDark : PlaygroundCoverDark}
            instanceIdPrefix={SETTINGS_API_HERO_INSTANCE_ID_PREFIX}
            tabs={[
              {
                id: 'api_webhook_walkthrough',
                title: t`Walkthrough`,
                Icon: IconSparkle2,
                vimeoId: '1217967646',
                hasSound: true,
              },
            ]}
            playButtonAriaLabel={t`Watch API demo`}
          />
        </Section.Root>

        {activeTab === SETTINGS_API_WEBHOOKS_TABS.TABS_IDS.API && (
          <div {...stylex.props(styles.tabContent)}>
            <Section.Root>
              <Section.Header
                title={t`Documentation`}
                description={t`Try our REST or GraphQL API playgrounds`}
              />
              <PlaygroundSetupForm />
            </Section.Root>

            <Section.Root>
              <Section.Header
                title={t`API Keys`}
                description={t`Active API keys created by you or your team.`}
              />
              <div
                {...stylex.props(
                  styles.tableContainer,
                  isMobile && styles.tableContainerMobile,
                )}
              >
                <SettingsApiKeysTable />
                <div {...stylex.props(styles.buttonContainer)}>
                  <NavigationButton
                    startIcon={<IconPlus />}
                    size="sm"
                    to={getSettingsPath(SettingsPath.NewApiKey)}
                    variant="outline"
                  >{t`Create API key`}</NavigationButton>
                </div>
              </div>
            </Section.Root>
          </div>
        )}

        {activeTab === SETTINGS_API_WEBHOOKS_TABS.TABS_IDS.MCP && (
          <div {...stylex.props(styles.tabContent)}>
            <SettingsMcpSetup />
          </div>
        )}

        {activeTab === SETTINGS_API_WEBHOOKS_TABS.TABS_IDS.WEBHOOKS && (
          <div {...stylex.props(styles.tabContent)}>
            <Section.Root>
              <Section.Header
                title={t`Webhooks`}
                description={t`Establish Webhook endpoints for notifications on asynchronous events.`}
              />
              <div
                {...stylex.props(
                  styles.tableContainer,
                  isMobile && styles.tableContainerMobile,
                )}
              >
                <SettingsWebhooksTable />
                <div {...stylex.props(styles.buttonContainer)}>
                  <NavigationButton
                    startIcon={<IconPlus />}
                    size="sm"
                    to={getSettingsPath(SettingsPath.NewWebhook)}
                    variant="outline"
                  >{t`Create webhook`}</NavigationButton>
                </div>
              </div>
            </Section.Root>
          </div>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
