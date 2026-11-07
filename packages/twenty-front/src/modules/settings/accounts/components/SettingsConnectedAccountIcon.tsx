import { type ConnectedAccount } from '@/accounts/types/ConnectedAccount';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { type IconComponent, IconGoogle, IconMail } from 'twenty-ui/icon';

const getIconForProvider = (account: ConnectedAccount): IconComponent => {
  switch (account.provider) {
    case ConnectedAccountProvider.GOOGLE:
      return IconGoogle;
    default:
      return IconMail;
  }
};

export const SettingsConnectedAccountIcon = ({
  account,
}: {
  account: ConnectedAccount;
}): IconComponent => {
  return getIconForProvider(account);
};
