import { ToastOnQueryErrorEffect } from '@/apollo/components/ToastOnQueryErrorEffect';
import { Link, useNavigate } from 'react-router-dom';

import { SettingsPath } from 'twenty-shared/types';

import { SettingsCard } from '@/settings/components/SettingsCard';
import { SettingsListCard } from '@/settings/components/SettingsListCard';
import { useGetAddedRelativeDateDescription } from '@/settings/hooks/useGetAddedRelativeDateDescription';
import { SettingsSecurityApprovedAccessDomainRowDropdownMenu } from '@/settings/security/components/approvedAccessDomains/SettingsSecurityApprovedAccessDomainRowDropdownMenu';
import { SettingsSecurityApprovedAccessDomainValidationEffect } from '@/settings/security/components/approvedAccessDomains/SettingsSecurityApprovedAccessDomainValidationEffect';
import { approvedAccessDomainsState } from '@/settings/security/states/ApprovedAccessDomainsState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useQuery } from '@apollo/client/react';
import * as stylex from '@stylexjs/stylex';
import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import { getSettingsPath } from 'twenty-shared/utils';
import { Status } from 'twenty-ui/primitives/data-display';
import { IconAt, IconMailCog } from 'twenty-ui/icon';
import { GetApprovedAccessDomainsDocument } from '~/generated-metadata/graphql';

const styles = stylex.create({
  link: {
    textDecoration: 'none',
  },
});

export const SettingsApprovedAccessDomainsListCard = () => {
  const navigate = useNavigate();
  const { t } = useLingui();
  const { getAddedRelativeDateDescription } =
    useGetAddedRelativeDateDescription();

  const [approvedAccessDomains, setApprovedAccessDomains] = useAtomState(
    approvedAccessDomainsState,
  );

  const {
    loading,
    data: domainsData,
    error: domainsError,
  } = useQuery(GetApprovedAccessDomainsDocument, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (domainsData) {
      setApprovedAccessDomains(domainsData?.getApprovedAccessDomains ?? []);
    }
  }, [domainsData, setApprovedAccessDomains]);

  return (
    <>
      <ToastOnQueryErrorEffect error={domainsError} />
      {loading || !approvedAccessDomains.length ? (
        <div>
          <Link
            to={getSettingsPath(SettingsPath.NewApprovedAccessDomain)}
            {...stylex.props(styles.link)}
          >
            <SettingsCard
              title={t`Add Approved Access Domain`}
              Icon={<IconMailCog />}
            />
          </Link>
        </div>
      ) : (
        <>
          <SettingsSecurityApprovedAccessDomainValidationEffect />
          <SettingsListCard
            items={approvedAccessDomains}
            getItemLabel={({ domain }) => domain}
            getItemDescription={({ createdAt }) =>
              getAddedRelativeDateDescription(createdAt)
            }
            RowIcon={IconAt}
            RowRightComponent={({ item: approvedAccessDomain }) => (
              <>
                {!approvedAccessDomain.isValidated && (
                  <Status color="orange">{t`Pending`}</Status>
                )}
                <SettingsSecurityApprovedAccessDomainRowDropdownMenu
                  approvedAccessDomain={approvedAccessDomain}
                />
              </>
            )}
            hasFooter
            footerButtonLabel={t`Add Approved Access Domain`}
            onFooterButtonClick={() =>
              navigate(getSettingsPath(SettingsPath.NewApprovedAccessDomain))
            }
          />
        </>
      )}
    </>
  );
};
