import { type SettingsCustomizeVideoModalTab } from '@/settings/types/SettingsCustomizeVideoModalTab';
import { SettingsCustomizeVideoModal } from '@/settings/components/SettingsCustomizeVideoModal';
import { HeroPlayButton } from '@/ui/layout/hero/components/HeroPlayButton';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { Card } from 'twenty-ui/primitives/surfaces';
import { useThemeColorScheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor } from 'twenty-ui/theme/tokens.stylex';

const DEFAULT_COVER_HEIGHT = 150;

const styles = stylex.create({
  cover: (coverHeight: number) => ({
    background: background['--t-background-secondary'],
    boxSizing: 'border-box',
    height: `${coverHeight}px`,
    overflow: 'hidden',
    position: 'relative',
  }),
  image: {
    display: 'block',
    height: '100%',
    inset: '0',
    objectFit: 'cover',
    objectPosition: 'center top',
    position: 'absolute',
    width: '100%',
  },
  overlay: {
    alignItems: 'center',
    display: 'flex',
    inset: '0',
    justifyContent: 'center',
    position: 'absolute',
  },
  footer: {
    background: background['--t-background-secondary'],
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: borderColor['--t-border-color-medium'],
  },
});

type SettingsDiscoveryHeroCardProps = {
  lightSrc: string;
  darkSrc: string;
  instanceIdPrefix: string;
  tabs: SettingsCustomizeVideoModalTab[];
  coverHeight?: number;
  footer?: ReactNode;
  playButtonAriaLabel?: string;
};

export const SettingsDiscoveryHeroCard = ({
  lightSrc,
  darkSrc,
  instanceIdPrefix,
  tabs,
  coverHeight = DEFAULT_COVER_HEIGHT,
  footer,
  playButtonAriaLabel,
}: SettingsDiscoveryHeroCardProps) => {
  const { t } = useLingui();
  const colorScheme = useThemeColorScheme();
  const { openDialog } = useDialog();
  const shouldDisplayVideo = tabs.length > 0;

  const modalInstanceId = `${instanceIdPrefix}-modal`;
  const tabsInstanceId = `${instanceIdPrefix}-tabs`;

  const src = colorScheme === 'light' ? lightSrc : darkSrc;

  return (
    <>
      <Card.Root rounded>
        <div {...stylex.props(styles.cover(coverHeight))}>
          <img src={src} alt="" aria-hidden {...stylex.props(styles.image)} />
          {shouldDisplayVideo && (
            <div {...stylex.props(styles.overlay)}>
              <HeroPlayButton
                onClick={() => openDialog(modalInstanceId)}
                ariaLabel={playButtonAriaLabel ?? t`Watch demo`}
              />
            </div>
          )}
        </div>
        {footer !== undefined && footer !== null && (
          <div {...stylex.props(styles.footer)}>{footer}</div>
        )}
      </Card.Root>
      {shouldDisplayVideo && (
        <SettingsCustomizeVideoModal
          modalInstanceId={modalInstanceId}
          tabsInstanceId={tabsInstanceId}
          tabs={tabs}
        />
      )}
    </>
  );
};
