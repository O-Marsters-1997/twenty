import { UndecoratedLink } from '@/ui/navigation/link/components/UndecoratedLink/UndecoratedLink';
import { getWorkspaceAvatarColorSeed } from '@/workspace/utils/getWorkspaceAvatarColorSeed';
import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { getImageAbsoluteURI, isDefined } from 'twenty-shared/utils';
import { Avatar } from 'twenty-ui/primitives/data-display';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { useRedirectToDefaultDomain } from '@/domain-manager/hooks/useRedirectToDefaultDomain';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type LogoProps = {
  primaryLogo?: string | null;
  secondaryLogo?: string | null;
  placeholder?: string | null;
  onClick?: () => void;
  to?: AppPath;
};

const styles = stylex.create({
  primaryLogo: {
    backgroundSize: 'cover',
    height: '100%',
    width: '100%',
  },
  container: {
    position: 'relative',
    height: spacing['--t-spacing-12'],
    marginBottom: spacing['--t-spacing-4'],
    marginTop: spacing['--t-spacing-4'],
    width: spacing['--t-spacing-12'],
  },
  secondaryLogo: {
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    height: spacing['--t-spacing-6'],
    width: spacing['--t-spacing-6'],
  },
  secondaryLogoContainer: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    justifyContent: 'center',
    position: 'absolute',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    bottom: `calc(-1 * ${spacing['--t-spacing-3']})`,
    height: spacing['--t-spacing-7'],
    right: `calc(-1 * ${spacing['--t-spacing-3']})`,
    width: spacing['--t-spacing-7'],
  },
});

export const Logo = ({
  primaryLogo,
  secondaryLogo,
  placeholder,
  onClick,
  to = AppPath.SignInUp,
}: LogoProps) => {
  const { redirectToDefaultDomain } = useRedirectToDefaultDomain();
  const defaultPrimaryLogoUrl = `${window.location.origin}/images/icons/android/android-launchericon-192-192.png`;

  const primaryLogoUrl = getImageAbsoluteURI({
    imageUrl: primaryLogo ?? defaultPrimaryLogoUrl,
    baseUrl: REACT_APP_SERVER_BASE_URL,
  });

  const secondaryLogoUrl = isNonEmptyString(secondaryLogo)
    ? getImageAbsoluteURI({
        imageUrl: secondaryLogo,
        baseUrl: REACT_APP_SERVER_BASE_URL,
      })
    : null;

  const isUsingDefaultLogo = !isDefined(primaryLogo);

  return (
    <div onClick={() => onClick?.()} {...stylex.props(styles.container)}>
      {isUsingDefaultLogo ? (
        <UndecoratedLink to={to} onClick={() => redirectToDefaultDomain()}>
          <div
            {...stylex.props(styles.primaryLogo)}
            style={{ backgroundImage: `url(${primaryLogoUrl})` }}
          />
        </UndecoratedLink>
      ) : (
        <div
          {...stylex.props(styles.primaryLogo)}
          style={{ backgroundImage: `url(${primaryLogoUrl})` }}
        />
      )}
      {isDefined(secondaryLogoUrl) ? (
        <div {...stylex.props(styles.secondaryLogoContainer)}>
          <img src={secondaryLogoUrl} {...stylex.props(styles.secondaryLogo)} />
        </div>
      ) : (
        isDefined(placeholder) && (
          <div {...stylex.props(styles.secondaryLogoContainer)}>
            <Avatar
              size="lg"
              name={placeholder}
              shape="square"
              colorSeed={getWorkspaceAvatarColorSeed(placeholder)}
            />
          </div>
        )
      )}
    </div>
  );
};
