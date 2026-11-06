import { lazy, Suspense } from 'react';
import {
  createRoutesFromElements,
  Navigate,
  Outlet,
  type Params,
  parsePath,
  Route,
  useLocation,
  useParams,
} from 'react-router-dom';

import {
  type WorkspaceRouteHandle,
  type WorkspaceRouteObject,
} from '@/app/routing/types/WorkspaceRouteObject';
import { SettingsProtectedRouteWrapper } from '@/settings/components/SettingsProtectedRouteWrapper';
import { SettingsSkeletonLoader } from '@/settings/components/SettingsSkeletonLoader';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { PermissionFlagType } from '~/generated-metadata/graphql';

const SettingsGraphQLPlayground = lazy(() =>
  import('~/pages/settings/developers/playground/SettingsGraphQLPlayground').then(
    (module) => ({
      default: module.SettingsGraphQLPlayground,
    }),
  ),
);

const SettingsRestPlayground = lazy(() =>
  import('~/pages/settings/developers/playground/SettingsRestPlayground').then(
    (module) => ({
      default: module.SettingsRestPlayground,
    }),
  ),
);

// TODO: remove these legacy /api-webhooks redirects after 2026-08-04.
const LEGACY_API_WEBHOOKS_SETTINGS_PATHS = {
  ApiWebhooks: 'api-webhooks',
  NewApiKey: 'api-webhooks/apis/new',
  ApiKeyDetail: 'api-webhooks/apis/:apiKeyId',
  NewWebhook: 'api-webhooks/webhooks/new',
  WebhookDetail: 'api-webhooks/webhooks/:webhookId',
} as const;

type LegacySettingsPathRedirectProps = {
  to:
    | SettingsPath.ApiWebhooks
    | SettingsPath.NewApiKey
    | SettingsPath.ApiKeyDetail
    | SettingsPath.NewWebhook
    | SettingsPath.WebhookDetail;
};

const getLegacySettingsPathRedirectPathname = (
  to: LegacySettingsPathRedirectProps['to'],
  params: Readonly<Params<string>>,
) => {
  switch (to) {
    case SettingsPath.ApiKeyDetail:
      return getSettingsPath(SettingsPath.ApiKeyDetail, {
        apiKeyId: params.apiKeyId ?? null,
      });
    case SettingsPath.WebhookDetail:
      return getSettingsPath(SettingsPath.WebhookDetail, {
        webhookId: params.webhookId ?? null,
      });
    case SettingsPath.ApiWebhooks:
    case SettingsPath.NewApiKey:
    case SettingsPath.NewWebhook:
      return getSettingsPath(to);
  }
};

function LegacySettingsPathRedirect({ to }: LegacySettingsPathRedirectProps) {
  const location = useLocation();
  const params = useParams();
  const pathname = getLegacySettingsPathRedirectPathname(to, params);

  return (
    <Navigate to={`${pathname}${location.search}${location.hash}`} replace />
  );
}

const SettingsAccountsConfiguration = lazy(() =>
  import('~/pages/settings/accounts/SettingsAccountsConfiguration').then(
    (module) => ({
      default: module.SettingsAccountsConfiguration,
    }),
  ),
);

const SettingsNewAccount = lazy(() =>
  import('~/pages/settings/accounts/SettingsNewAccount').then((module) => ({
    default: module.SettingsNewAccount,
  })),
);

const SettingsNewObject = lazy(() =>
  import('~/pages/settings/data-model/SettingsNewObject').then((module) => ({
    default: module.SettingsNewObject,
  })),
);

const SettingsNewImapSmtpCaldavConnection = lazy(() =>
  import('~/pages/settings/accounts/SettingsAccountsNewImapSmtpCaldavConnection').then(
    (module) => ({
      default: module.SettingsAccountsNewImapSmtpCaldavConnection,
    }),
  ),
);

const SettingsEditImapSmtpCaldavConnection = lazy(() =>
  import('~/pages/settings/accounts/SettingsAccountsEditImapSmtpCaldavConnection').then(
    (module) => ({
      default: module.SettingsAccountsEditImapSmtpCaldavConnection,
    }),
  ),
);

const SettingsNewEmailGroupChannel = lazy(() =>
  import('~/pages/settings/accounts/SettingsAccountsNewEmailGroupChannel').then(
    (module) => ({
      default: module.SettingsAccountsNewEmailGroupChannel,
    }),
  ),
);

const SettingsObjectDetailPage = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectDetailPage').then(
    (module) => ({
      default: module.SettingsObjectDetailPage,
    }),
  ),
);

const SettingsObjectOverview = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectOverview').then(
    (module) => ({
      default: module.SettingsObjectOverview,
    }),
  ),
);

const SettingsDevelopersApiKeyDetail = lazy(() =>
  import('~/pages/settings/developers/api-keys/SettingsDevelopersApiKeyDetail').then(
    (module) => ({
      default: module.SettingsDevelopersApiKeyDetail,
    }),
  ),
);

const SettingsDevelopersApiKeysNew = lazy(() =>
  import('~/pages/settings/developers/api-keys/SettingsDevelopersApiKeysNew').then(
    (module) => ({
      default: module.SettingsDevelopersApiKeysNew,
    }),
  ),
);

const SettingsGeneral = lazy(() =>
  import('~/pages/settings/general/SettingsGeneral').then((module) => ({
    default: module.SettingsGeneral,
  })),
);

const SettingsLegalDpa = lazy(() =>
  import('~/pages/settings/legal/SettingsLegalDpa').then((module) => ({
    default: module.SettingsLegalDpa,
  })),
);

const SettingsLegalDpaNew = lazy(() =>
  import('~/pages/settings/legal/SettingsLegalDpaNew').then((module) => ({
    default: module.SettingsLegalDpaNew,
  })),
);

const SettingsWorkspaceCommunications = lazy(() =>
  import('~/pages/settings/communications/SettingsWorkspaceCommunications').then(
    (module) => ({
      default: module.SettingsWorkspaceCommunications,
    }),
  ),
);

const SettingsWorkspaceCommunicationGroupChannelDetail = lazy(() =>
  import('~/pages/settings/communications/SettingsWorkspaceCommunicationGroupChannelDetail').then(
    (module) => ({
      default: module.SettingsWorkspaceCommunicationGroupChannelDetail,
    }),
  ),
);

const SettingsWorkspaceNewUnsubscribeTopic = lazy(() =>
  import('~/pages/settings/communications/SettingsWorkspaceNewUnsubscribeTopic').then(
    (module) => ({
      default: module.SettingsWorkspaceNewUnsubscribeTopic,
    }),
  ),
);

const SettingsWorkspaceUnsubscribeTopicDetail = lazy(() =>
  import('~/pages/settings/communications/SettingsWorkspaceUnsubscribeTopicDetail').then(
    (module) => ({
      default: module.SettingsWorkspaceUnsubscribeTopicDetail,
    }),
  ),
);

const SettingsWorkspaceUnsubscribe = lazy(() =>
  import('~/pages/settings/communications/SettingsWorkspaceUnsubscribe').then(
    (module) => ({
      default: module.SettingsWorkspaceUnsubscribe,
    }),
  ),
);

const SettingsSubdomainPage = lazy(() =>
  import('~/pages/settings/domains/SettingsSubdomainPage').then((module) => ({
    default: module.SettingsSubdomainPage,
  })),
);

const SettingsCustomDomainPage = lazy(() =>
  import('~/pages/settings/domains/SettingsCustomDomainPage').then(
    (module) => ({
      default: module.SettingsCustomDomainPage,
    }),
  ),
);

const SettingsApiWebhooks = lazy(() =>
  import('~/pages/settings/api-webhooks/SettingsApiWebhooks').then(
    (module) => ({
      default: module.SettingsApiWebhooks,
    }),
  ),
);

const SettingsAI = lazy(() =>
  import('~/pages/settings/ai/SettingsAI').then((module) => ({
    default: module.SettingsAI,
  })),
);

const SettingsAiUsageUserDetail = lazy(() =>
  import('~/pages/settings/ai/SettingsAiUsageUserDetail').then((module) => ({
    default: module.SettingsAiUsageUserDetail,
  })),
);

const SettingsToolDetail = lazy(() =>
  import('~/pages/settings/ai/SettingsToolDetail').then((module) => ({
    default: module.SettingsToolDetail,
  })),
);

const SettingsLayout = lazy(() =>
  import('~/pages/settings/layout/SettingsLayout').then((module) => ({
    default: module.SettingsLayout,
  })),
);

const SettingsSkillForm = lazy(() =>
  import('~/pages/settings/ai/SettingsSkillForm').then((module) => ({
    default: module.SettingsSkillForm,
  })),
);

const SettingsAiPrompts = lazy(() =>
  import('~/pages/settings/ai/SettingsAiPrompts').then((module) => ({
    default: module.SettingsAiPrompts,
  })),
);

const SettingsWorkspaceMembers = lazy(() =>
  import('~/pages/settings/members/SettingsWorkspaceMembers').then(
    (module) => ({
      default: module.SettingsWorkspaceMembers,
    }),
  ),
);

const SettingsWorkspaceMember = lazy(() =>
  import('~/pages/settings/members/SettingsWorkspaceMember').then((module) => ({
    default: module.SettingsWorkspaceMember,
  })),
);

const SettingsProfile = lazy(() =>
  import('~/pages/settings/profile/SettingsProfile').then((module) => ({
    default: module.SettingsProfile,
  })),
);

const SettingsTwoFactorAuthenticationMethod = lazy(() =>
  import('~/pages/settings/profile/SettingsTwoFactorAuthenticationMethod').then(
    (module) => ({
      default: module.SettingsTwoFactorAuthenticationMethod,
    }),
  ),
);

const SettingsExperience = lazy(() =>
  import('~/pages/settings/profile/appearance/components/SettingsExperience').then(
    (module) => ({
      default: module.SettingsExperience,
    }),
  ),
);

const SettingsAccounts = lazy(() =>
  import('~/pages/settings/accounts/SettingsAccounts').then((module) => ({
    default: module.SettingsAccounts,
  })),
);

const SettingsAccountDetail = lazy(() =>
  import('~/pages/settings/accounts/SettingsAccountDetail').then((module) => ({
    default: module.SettingsAccountDetail,
  })),
);

const SettingsNativeAccountApp = lazy(() =>
  import('~/pages/settings/accounts/SettingsNativeAccountApp').then(
    (module) => ({
      default: module.SettingsNativeAccountApp,
    }),
  ),
);

const SettingsAccountsEmails = lazy(() =>
  import('~/pages/settings/accounts/SettingsAccountsEmails').then((module) => ({
    default: module.SettingsAccountsEmails,
  })),
);

const SettingsAccountsCalendars = lazy(() =>
  import('~/pages/settings/accounts/SettingsAccountsCalendars').then(
    (module) => ({
      default: module.SettingsAccountsCalendars,
    }),
  ),
);

const SettingsBilling = lazy(() =>
  import('~/pages/settings/billing/SettingsBilling').then((module) => ({
    default: module.SettingsBilling,
  })),
);

const SettingsBillingPlans = lazy(() =>
  import('~/pages/settings/billing/SettingsBillingPlans').then((module) => ({
    default: module.SettingsBillingPlans,
  })),
);

const SettingsUsage = lazy(() =>
  import('~/pages/settings/billing/SettingsUsage').then((module) => ({
    default: module.SettingsUsage,
  })),
);

const SettingsBillingLimits = lazy(() =>
  import('~/pages/settings/billing/SettingsBillingLimits').then((module) => ({
    default: module.SettingsBillingLimits,
  })),
);

const SettingsBillingNewLimit = lazy(() =>
  import('~/pages/settings/billing/SettingsBillingNewLimit').then((module) => ({
    default: module.SettingsBillingNewLimit,
  })),
);

const SettingsBillingLimitEdit = lazy(() =>
  import('~/pages/settings/billing/SettingsBillingLimitEdit').then(
    (module) => ({
      default: module.SettingsBillingLimitEdit,
    }),
  ),
);

const SettingsUsageUserDetail = lazy(() =>
  import('~/pages/settings/billing/SettingsUsageUserDetail').then((module) => ({
    default: module.SettingsUsageUserDetail,
  })),
);

const SettingsObjects = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjects').then((module) => ({
    default: module.SettingsObjects,
  })),
);

const SettingsDevelopersWebhookNew = lazy(() =>
  import('~/pages/settings/developers/webhooks/components/SettingsDevelopersWebhookNew').then(
    (module) => ({
      default: module.SettingsDevelopersWebhookNew,
    }),
  ),
);

const SettingsDevelopersWebhookDetail = lazy(() =>
  import('~/pages/settings/developers/webhooks/components/SettingsDevelopersWebhookDetail').then(
    (module) => ({
      default: module.SettingsDevelopersWebhookDetail,
    }),
  ),
);

const SettingsObjectNewFieldSelect = lazy(() =>
  import('~/pages/settings/data-model/new-field/SettingsObjectNewFieldSelect').then(
    (module) => ({
      default: module.SettingsObjectNewFieldSelect,
    }),
  ),
);

const SettingsObjectNewFieldConfigure = lazy(() =>
  import('~/pages/settings/data-model/new-field/SettingsObjectNewFieldConfigure').then(
    (module) => ({
      default: module.SettingsObjectNewFieldConfigure,
    }),
  ),
);

const SettingsObjectNewIndex = lazy(() =>
  import('~/pages/settings/data-model/new-index/SettingsObjectNewIndex').then(
    (module) => ({
      default: module.SettingsObjectNewIndex,
    }),
  ),
);

const SettingsObjectValidationRuleEdit = lazy(() =>
  import('~/pages/settings/data-model/validation-rules/SettingsObjectValidationRuleEdit').then(
    (module) => ({
      default: module.SettingsObjectValidationRuleEdit,
    }),
  ),
);

const SettingsObjectFieldEdit = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectFieldEdit').then(
    (module) => ({
      default: module.SettingsObjectFieldEdit,
    }),
  ),
);

const SettingsObjectTranslations = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectTranslations').then(
    (module) => ({
      default: module.SettingsObjectTranslations,
    }),
  ),
);

const SettingsSecuritySsoIdentifyProvider = lazy(() =>
  import('~/pages/settings/security/SettingsSecuritySsoIdentifyProvider').then(
    (module) => ({
      default: module.SettingsSecuritySsoIdentifyProvider,
    }),
  ),
);

const SettingsSecurityApprovedAccessDomain = lazy(() =>
  import('~/pages/settings/security/SettingsSecurityApprovedAccessDomain').then(
    (module) => ({
      default: module.SettingsSecurityApprovedAccessDomain,
    }),
  ),
);

const SettingsCommunity = lazy(() =>
  import('~/pages/settings/community/SettingsCommunity').then((module) => ({
    default: module.SettingsCommunity,
  })),
);

const SettingsRoleCreate = lazy(() =>
  import('~/pages/settings/members/roles/SettingsRoleCreate').then(
    (module) => ({
      default: module.SettingsRoleCreate,
    }),
  ),
);

const SettingsRoleEdit = lazy(() =>
  import('~/pages/settings/members/roles/SettingsRoleEdit').then((module) => ({
    default: module.SettingsRoleEdit,
  })),
);

const SettingsRoleObjectLevel = lazy(() =>
  import('~/pages/settings/members/roles/SettingsRoleObjectLevel').then(
    (module) => ({
      default: module.SettingsRoleObjectLevel,
    }),
  ),
);

const SettingsRoleAddObjectLevel = lazy(() =>
  import('~/pages/settings/members/roles/SettingsRoleAddObjectLevel').then(
    (module) => ({
      default: module.SettingsRoleAddObjectLevel,
    }),
  ),
);

type SettingsRouteHandle = WorkspaceRouteHandle;

const MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE: SettingsRouteHandle = {
  workspaceSurfaces: ['main', 'side-panel'],
};

const EXPANDABLE_SETTINGS_ROUTE_HANDLE: SettingsRouteHandle = {
  ...MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE,
  isLocationExpandableFromSidePanel: true,
};

const MEMBERS_LIST_SETTINGS_ROUTE_HANDLE: SettingsRouteHandle = {
  ...MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE,
  isLocationExpandableFromSidePanel: ({ location }) => {
    const hash =
      typeof location === 'string'
        ? (parsePath(location).hash ?? '')
        : (location.hash ?? '');

    return hash === '' || hash === '#team' || hash === '#roles';
  },
};

const createSettingsRouteElements = () => (
  <>
    <Route path={SettingsPath.ProfilePage} element={<SettingsProfile />} />
    <Route
      path={SettingsPath.TwoFactorAuthenticationStrategyConfig}
      element={<SettingsTwoFactorAuthenticationMethod />}
    />
    <Route path={SettingsPath.Experience} element={<SettingsExperience />} />
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.CONNECTED_ACCOUNTS}
        />
      }
    >
      <Route path={SettingsPath.Accounts} element={<SettingsAccounts />} />
      <Route
        path={SettingsPath.AccountDetail}
        element={<SettingsAccountDetail />}
      />
      <Route
        path={SettingsPath.NativeAccountApp}
        element={<SettingsNativeAccountApp />}
      />
      <Route
        path={SettingsPath.AccountsEmails}
        element={<SettingsAccountsEmails />}
      />
      <Route
        path={SettingsPath.AccountsCalendars}
        element={<SettingsAccountsCalendars />}
      />
      <Route path={SettingsPath.NewAccount} element={<SettingsNewAccount />} />
      <Route
        path={SettingsPath.AccountsConfiguration}
        element={<SettingsAccountsConfiguration />}
      />
      <Route
        path={SettingsPath.NewImapSmtpCaldavConnection}
        element={<SettingsNewImapSmtpCaldavConnection />}
      />
      <Route
        path={SettingsPath.EditImapSmtpCaldavConnection}
        element={<SettingsEditImapSmtpCaldavConnection />}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.WORKSPACE}
        />
      }
    >
      <Route path={SettingsPath.General} element={<SettingsGeneral />} />
      <Route
        path={SettingsPath.WorkspaceCommunications}
        element={<SettingsWorkspaceCommunications />}
      />
      <Route
        path={SettingsPath.NewEmailGroupChannel}
        element={<SettingsNewEmailGroupChannel />}
      />
      <Route
        path={SettingsPath.EmailGroupChannelDetail}
        element={<SettingsWorkspaceCommunicationGroupChannelDetail />}
      />
      <Route
        path={SettingsPath.NewUnsubscribeTopic}
        element={<SettingsWorkspaceNewUnsubscribeTopic />}
      />
      <Route
        path={SettingsPath.UnsubscribeTopicDetail}
        element={<SettingsWorkspaceUnsubscribeTopicDetail />}
      />
      <Route
        path={SettingsPath.Unsubscribe}
        element={<SettingsWorkspaceUnsubscribe />}
      />
      <Route path={SettingsPath.Billing} element={<SettingsBilling />} />
      <Route
        path={SettingsPath.BillingPlans}
        element={<SettingsBillingPlans />}
      />
      <Route path={SettingsPath.Usage} element={<SettingsUsage />} />
      <Route
        path={SettingsPath.UsageUserDetail}
        element={<SettingsUsageUserDetail />}
      />
      <Route
        path={SettingsPath.BillingLimits}
        element={<SettingsBillingLimits />}
      />
      <Route
        path={SettingsPath.BillingNewLimit}
        element={<SettingsBillingNewLimit />}
      />
      <Route
        path={SettingsPath.BillingLimitEdit}
        element={<SettingsBillingLimitEdit />}
      />
      <Route
        path={SettingsPath.Subdomain}
        element={<SettingsSubdomainPage />}
      />
      <Route
        path={SettingsPath.CustomDomain}
        element={<SettingsCustomDomainPage />}
      />
      <Route path={SettingsPath.LegalDpa} element={<SettingsLegalDpa />} />
      <Route
        path={SettingsPath.LegalDpaNew}
        element={<SettingsLegalDpaNew />}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.AI_SETTINGS}
        />
      }
    >
      <Route path={SettingsPath.AI} element={<SettingsAI />} />
      <Route path={SettingsPath.AiPrompts} element={<SettingsAiPrompts />} />
      <Route
        path={SettingsPath.AiNewSkill}
        element={<SettingsSkillForm mode="create" />}
      />
      <Route
        path={SettingsPath.AiSkillDetail}
        element={<SettingsSkillForm mode="edit" />}
      />
      <Route
        path={SettingsPath.AiUsageUserDetail}
        element={<SettingsAiUsageUserDetail />}
      />
      <Route
        path={SettingsPath.AiToolDetail}
        element={<SettingsToolDetail />}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.LAYOUTS}
        />
      }
    >
      <Route path={SettingsPath.Layout} element={<SettingsLayout />} />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.WORKSPACE_MEMBERS}
        />
      }
    >
      <Route
        path={SettingsPath.WorkspaceMembersPage}
        element={<SettingsWorkspaceMembers />}
        handle={MEMBERS_LIST_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.WorkspaceMemberPage}
        element={<SettingsWorkspaceMember />}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.DATA_MODEL}
        />
      }
    >
      <Route
        path={SettingsPath.Objects}
        element={<SettingsObjects />}
        handle={EXPANDABLE_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectOverview}
        element={<SettingsObjectOverview />}
        handle={EXPANDABLE_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectDetail}
        element={<SettingsObjectDetailPage />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.NewObject}
        element={<SettingsNewObject />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectNewFieldSelect}
        element={<SettingsObjectNewFieldSelect />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectNewFieldConfigure}
        element={<SettingsObjectNewFieldConfigure />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectNewIndex}
        element={<SettingsObjectNewIndex />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectValidationRuleEdit}
        element={<SettingsObjectValidationRuleEdit />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectFieldEdit}
        element={<SettingsObjectFieldEdit />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectTranslations}
        element={<SettingsObjectTranslations />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectFieldTranslations}
        element={<SettingsObjectTranslations />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.ROLES}
        />
      }
    >
      <Route
        path={SettingsPath.Roles}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
        element={
          <Navigate
            to={`/settings/${SettingsPath.WorkspaceMembersPage}#roles`}
            replace
          />
        }
      />
      <Route
        path={SettingsPath.RoleDetail}
        element={<SettingsRoleEdit />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.RoleCreate}
        element={<SettingsRoleCreate />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.RoleObjectLevel}
        element={<SettingsRoleObjectLevel />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.RoleAddObjectLevel}
        element={<SettingsRoleAddObjectLevel />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.API_KEYS_AND_WEBHOOKS}
        />
      }
    >
      <Route
        path={LEGACY_API_WEBHOOKS_SETTINGS_PATHS.ApiWebhooks}
        element={<LegacySettingsPathRedirect to={SettingsPath.ApiWebhooks} />}
      />
      <Route
        path={LEGACY_API_WEBHOOKS_SETTINGS_PATHS.NewApiKey}
        element={<LegacySettingsPathRedirect to={SettingsPath.NewApiKey} />}
      />
      <Route
        path={LEGACY_API_WEBHOOKS_SETTINGS_PATHS.ApiKeyDetail}
        element={<LegacySettingsPathRedirect to={SettingsPath.ApiKeyDetail} />}
      />
      <Route
        path={LEGACY_API_WEBHOOKS_SETTINGS_PATHS.NewWebhook}
        element={<LegacySettingsPathRedirect to={SettingsPath.NewWebhook} />}
      />
      <Route
        path={LEGACY_API_WEBHOOKS_SETTINGS_PATHS.WebhookDetail}
        element={<LegacySettingsPathRedirect to={SettingsPath.WebhookDetail} />}
      />
      <Route
        path={SettingsPath.ApiWebhooks}
        element={<SettingsApiWebhooks />}
      />
      <Route
        path={`${SettingsPath.GraphQLPlayground}`}
        element={<SettingsGraphQLPlayground />}
      />
      <Route
        path={`${SettingsPath.RestPlayground}/*`}
        element={<SettingsRestPlayground />}
      />
      <Route
        path={SettingsPath.NewApiKey}
        element={<SettingsDevelopersApiKeysNew />}
      />
      <Route
        path={SettingsPath.ApiKeyDetail}
        element={<SettingsDevelopersApiKeyDetail />}
      />
      <Route
        path={SettingsPath.NewWebhook}
        element={<SettingsDevelopersWebhookNew />}
      />
      <Route
        path={SettingsPath.WebhookDetail}
        element={<SettingsDevelopersWebhookDetail />}
      />
    </Route>
    <Route
      path="security"
      element={<Navigate to={getSettingsPath(SettingsPath.Security)} replace />}
    />

    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.SECURITY}
        />
      }
    >
      <Route
        path={SettingsPath.NewSsoIdentityProvider}
        element={<SettingsSecuritySsoIdentifyProvider />}
      />
      <Route
        path={SettingsPath.NewApprovedAccessDomain}
        element={<SettingsSecurityApprovedAccessDomain />}
      />
    </Route>

    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.WORKSPACE}
        />
      }
    >
      <Route path={SettingsPath.Community} element={<SettingsCommunity />} />
    </Route>
  </>
);

const removeGeneratedRouteIds = (
  routeObjects: WorkspaceRouteObject[],
): WorkspaceRouteObject[] =>
  routeObjects.map(({ id: _generatedId, children, ...routeObject }) => ({
    ...routeObject,
    children: children && removeGeneratedRouteIds(children),
  }));

export const createSettingsRouteObjects = (): WorkspaceRouteObject[] =>
  removeGeneratedRouteIds(
    createRoutesFromElements(
      createSettingsRouteElements(),
    ) as WorkspaceRouteObject[],
  );

export const SettingsRouteOutlet = () => (
  <Suspense fallback={<SettingsSkeletonLoader />}>
    <Outlet />
  </Suspense>
);
