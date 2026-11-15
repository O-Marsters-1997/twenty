import { useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { IconRefresh } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, blur, borderRadius, boxShadow, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type AppConnectionHeaderProps = {
  appLogoUrl?: string | null;
  appName: string;
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'center',
  },
  appLogoTile: {
    alignItems: 'center',
    backdropFilter: blur['--t-blur-strong'],
    background: background['--t-background-primary'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    height: spacing['--t-spacing-12'],
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    width: spacing['--t-spacing-12'],
  },
  appLogo: {
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    height: spacing['--t-spacing-10'],
    objectFit: 'cover',
    width: spacing['--t-spacing-10'],
  },
  linkIconContainer: {
    alignItems: 'center',
    background: background['--t-background-primary'],
    borderTopLeftRadius: borderRadius['--t-border-radius-rounded'],
    borderTopRightRadius: borderRadius['--t-border-radius-rounded'],
    borderBottomRightRadius: borderRadius['--t-border-radius-rounded'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-rounded'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    color: fontColor['--t-font-color-primary'],
    cornerShape: 'round',
    display: 'flex',
    flexShrink: '0',
    height: spacing['--t-spacing-6'],
    justifyContent: 'center',
    width: spacing['--t-spacing-6'],
  },
});

export const AppConnectionHeader = ({
  appLogoUrl,
  appName,
}: AppConnectionHeaderProps) => {
  const theme = useTheme();

  const [hasAppLogoError, setHasAppLogoError] = useState(false);

  const showAppLogoImage = isNonEmptyString(appLogoUrl) && !hasAppLogoError;

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.appLogoTile)}>
        <img src={'/images/integrations/twenty-logo.svg'} alt="" {...stylex.props(styles.appLogo)} />
      </div>
      <div aria-hidden {...stylex.props(styles.linkIconContainer)}>
        <IconRefresh size={theme.icon.size.md} stroke={theme.icon.stroke.lg} />
      </div>
      <div {...stylex.props(styles.appLogoTile)}>
        {showAppLogoImage ? (
          <img
            src={appLogoUrl}
            alt=""
            onError={() => setHasAppLogoError(true)} {...stylex.props(styles.appLogo)}
          />
        ) : (
          <Avatar size="xl" name={appName} colorSeed={appName} shape="square" />
        )}
      </div>
    </div>
  );
};
