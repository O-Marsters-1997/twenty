import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { UndecoratedLink } from '@/ui/navigation/link/components/UndecoratedLink/UndecoratedLink';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { IconWorldWww } from 'twenty-ui/icon';

export const SettingsWorkspaceDomainCard = () => {
  const { t } = useLingui();
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );

  if (!isMultiWorkspaceEnabled) {
    return null;
  }

  return (
    <UndecoratedLink to={getSettingsPath(SettingsPath.Subdomain)} fullWidth>
      <SettingsCard title={t`Subdomain`} Icon={<IconWorldWww />} />
    </UndecoratedLink>
  );
};
