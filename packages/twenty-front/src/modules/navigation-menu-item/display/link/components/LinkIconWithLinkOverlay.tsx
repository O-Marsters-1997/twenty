import { ColoredIcon } from '@/ui/icon/components/ColoredIcon';
import { useState } from 'react';
import { getLinkFaviconUrl, isDefined } from 'twenty-shared/utils';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';

import { DEFAULT_NAVIGATION_MENU_ITEM_COLOR_LINK } from '@/navigation-menu-item/common/constants/NavigationMenuItemDefaultColorLink';
import * as stylex from '@stylexjs/stylex';
import {
  borderRadius,
  grayScale,
  iconSize,
} from 'twenty-ui/theme/tokens.stylex';

const failedFaviconUrls = new Set<string>();

const styles = stylex.create({
  compositeContainer: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    height: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    justifyContent: 'center',
    position: 'relative',
    width: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
  },
  faviconImage: {
    display: 'block',
    flexShrink: '0',
    height: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    objectFit: 'contain',
    width: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
  },
  linkOverlay: {
    alignItems: 'center',
    backgroundColor: grayScale['--t-gray-scale-gray4'],
    borderRadius: borderRadius['--t-border-radius-xs'],
    bottom: '-5px',
    display: 'flex',
    height: '14px',
    justifyContent: 'center',
    position: 'absolute',
    right: '-6px',
    width: '14px',
  },
});

export type LinkIconWithLinkOverlayProps = {
  link: string | null | undefined;
  LinkIcon: IconComponent;
  DefaultIcon: IconComponent;
  color?: string | null;
};

export const LinkIconWithLinkOverlay = ({
  link,
  LinkIcon,
  DefaultIcon,
  color: navItemColor,
}: LinkIconWithLinkOverlayProps) => {
  const theme = useTheme();
  const [localFailedLink, setLocalFailedLink] = useState<string | null>(null);
  const faviconUrl = getLinkFaviconUrl(link);
  const linkKey = link ?? '';
  const isKnownFailed = failedFaviconUrls.has(linkKey);
  const showFavicon =
    isDefined(faviconUrl) && !isKnownFailed && localFailedLink !== linkKey;

  return (
    <div {...stylex.props(styles.compositeContainer)}>
      {showFavicon ? (
        <img
          src={faviconUrl}
          alt=""
          onError={() => {
            if (isDefined(link)) failedFaviconUrls.add(link);
            setLocalFailedLink(linkKey);
          }}
          {...stylex.props(styles.faviconImage)}
        />
      ) : (
        <ColoredIcon
          Icon={DefaultIcon}
          color={navItemColor ?? DEFAULT_NAVIGATION_MENU_ITEM_COLOR_LINK}
        />
      )}
      <div {...stylex.props(styles.linkOverlay)}>
        <LinkIcon
          size="14px"
          stroke={theme.icon.stroke.md}
          color={themeCssVariables.grayScale.gray10}
        />
      </div>
    </div>
  );
};
