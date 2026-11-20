import { InformationBannerReconnectAccountEmailAliases } from '@/information-banner/components/reconnect-account/InformationBannerReconnectAccountEmailAliases';
import { InformationBannerReconnectAccountInsufficientPermissions } from '@/information-banner/components/reconnect-account/InformationBannerReconnectAccountInsufficientPermissions';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  informationBannerWrapper: {
    position: 'relative',
    height: { default: null, ':empty': '0' },
  },
});

export const InformationBannerWrapper = () => {
  const isAccountSyncEnabled = useHasPermissionFlag(
    PermissionFlagType.CONNECTED_ACCOUNTS,
  );

  return (
    <div {...stylex.props(styles.informationBannerWrapper)}>
      {isAccountSyncEnabled && (
        <InformationBannerReconnectAccountInsufficientPermissions />
      )}
      {isAccountSyncEnabled && (
        <InformationBannerReconnectAccountEmailAliases />
      )}
    </div>
  );
};
