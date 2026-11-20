import { SettingsCard } from '@/settings/components/SettingsCard';
import { SettingsDiscoveryHeroCard } from '@/settings/components/SettingsDiscoveryHeroCard';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsLabContent } from '@/settings/lab/components/SettingsLabContent';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { t } from '@lingui/core/macro';
import { Section } from 'twenty-ui/components/layout';
import {
  IconBrandX,
  IconBriefcase,
  IconTransform,
  type IconComponent,
  useIcons,
} from 'twenty-ui/icon';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import coverDark from '~/pages/settings/community/assets/cover-dark.png';
import coverLight from '~/pages/settings/community/assets/cover-light.png';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const SETTINGS_COMMUNITY_HERO_INSTANCE_ID_PREFIX = 'settings-community-hero';

const styles = stylex.create({
  cardLink: {
    textDecoration: 'none',
    display: 'block',
    minWidth: '0',
  },
  cardsGrid: {
    gap: spacing['--t-spacing-2'],
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(2, minmax(0, 1fr))',
      [media.mobile]: '1fr',
    },
  },
  featuresContent: {
    gap: spacing['--t-spacing-4'],
    display: 'grid',
  },
});

type SettingsCommunityLink = {
  href: string;
  Icon: IconComponent;
  iconColor: string;
  cardTitle: string;
};

export const SettingsCommunity = () => {
  const theme = useTheme();
  const { getIcon } = useIcons();
  const IconBrandDiscord = getIcon('IconBrandDiscord');

  const socialLinks: SettingsCommunityLink[] = [
    {
      href: 'https://discord.com/invite/cx5n4Jzs57',
      Icon: IconBrandDiscord,
      iconColor: themeCssVariables.color.blue9,
      cardTitle: t`Join our Discord`,
    },
    {
      href: 'https://x.com/twentycrm',
      Icon: IconBrandX,
      iconColor: themeCssVariables.font.color.primary,
      cardTitle: t`Follow us on X`,
    },
  ];

  return (
    <SettingsPageLayout
      title={t`Community`}
      links={[
        {
          children: t`Other`,
          href: getSettingsPath(SettingsPath.Community),
        },
        { children: t`Community` },
      ]}
    >
      <SettingsPageContainer>
        <Section.Root>
          <SettingsDiscoveryHeroCard
            lightSrc={coverLight}
            darkSrc={coverDark}
            instanceIdPrefix={SETTINGS_COMMUNITY_HERO_INSTANCE_ID_PREFIX}
            tabs={[]}
          />
        </Section.Root>

        <Section.Root>
          <Section.Header
            title={t`Join the community`}
            description={t`Stay up to date with product news and community updates.`}
          />
          <div {...stylex.props(styles.cardsGrid)}>
            {socialLinks.map(({ href, Icon, iconColor, cardTitle }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...stylex.props(styles.cardLink)}
              >
                <SettingsCard
                  Icon={
                    <Icon
                      size={theme.icon.size.md}
                      stroke={theme.icon.stroke.sm}
                    />
                  }
                  iconColor={iconColor}
                  title={cardTitle}
                />
              </a>
            ))}
          </div>
        </Section.Root>

        <Section.Root>
          <Section.Header
            title={t`Partners`}
            description={t`Hire a partner to help you implement and customize Twenty.`}
          />
          <a
            href="https://twenty.com/partners/list"
            target="_blank"
            rel="noopener noreferrer"
            {...stylex.props(styles.cardLink)}
          >
            <SettingsCard
              Icon={
                <IconBriefcase
                  size={theme.icon.size.md}
                  stroke={theme.icon.stroke.sm}
                />
              }
              title={t`Browse partners`}
            />
          </a>
        </Section.Root>

        <Section.Root>
          <Section.Header
            title={t`Features`}
            description={t`Try our upcoming features. Note they are still in beta. Please bear with us and report any issues you find.`}
          />
          <div {...stylex.props(styles.featuresContent)}>
            <SettingsLabContent />
            <a
              href="https://twenty.com/releases"
              target="_blank"
              rel="noopener noreferrer"
              {...stylex.props(styles.cardLink)}
            >
              <SettingsCard
                Icon={
                  <IconTransform
                    size={theme.icon.size.md}
                    stroke={theme.icon.stroke.sm}
                  />
                }
                title={t`Read changelog`}
              />
            </a>
          </div>
        </Section.Root>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
