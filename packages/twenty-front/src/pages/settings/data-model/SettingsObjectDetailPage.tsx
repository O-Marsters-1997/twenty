import { NavigationButton } from '@/ui/input/components/NavigationButton';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { WorkspaceRouteUnavailable } from '@/ui/layout/page/components/WorkspaceRouteUnavailable';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { ObjectFields } from '@/settings/data-model/object-details/components/tabs/ObjectFields';
import { ObjectLayout } from '@/settings/data-model/object-details/components/tabs/ObjectLayout';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsTabBar } from '@/settings/components/layout/SettingsTabBar';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { styled } from '@linaria/react';
import {
  AppPath,
  CoreObjectNameSingular,
  SettingsPath,
} from 'twenty-shared/types';

import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useLingui } from '@lingui/react/macro';
import { getAppPath, getSettingsPath, isDefined } from 'twenty-shared/utils';
import {
  IconArrowUpRight,
  IconAppWindow,
  IconListDetails,
} from 'twenty-ui/icon';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import { SETTINGS_OBJECT_DETAIL_TABS } from '~/pages/settings/data-model/constants/SettingsObjectDetailTabs';
import { updatedObjectNamePluralState } from '@/settings/data-model/object-details/states/updatedObjectNamePluralState';

const StyledContentContainer = styled.div`
  flex: 1;
  padding-left: 0;
  width: 100%;
`;

export const SettingsObjectDetailPage = () => {
  const navigateApp = useNavigateApp();
  const workspaceSurface = useWorkspaceSurface();
  const { t } = useLingui();
  const { objectNamePlural = '' } = useParams();

  const { findObjectMetadataItemByNamePlural } =
    useFilteredObjectMetadataItems();

  const [updatedObjectNamePlural, setUpdatedObjectNamePlural] = useAtomState(
    updatedObjectNamePluralState,
  );
  const objectMetadataItem =
    findObjectMetadataItemByNamePlural(objectNamePlural) ??
    findObjectMetadataItemByNamePlural(updatedObjectNamePlural);

  const tabsComponentInstanceId = useWorkspaceSurfaceScopedComponentInstanceId(
    SETTINGS_OBJECT_DETAIL_TABS.COMPONENT_INSTANCE_ID,
  );

  const activeTabId =
    useAtomComponentStateValue(
      activeTabIdComponentState,
      tabsComponentInstanceId,
    ) ?? SETTINGS_OBJECT_DETAIL_TABS.TABS_IDS.FIELDS;

  useEffect(() => {
    if (objectNamePlural === updatedObjectNamePlural)
      setUpdatedObjectNamePlural('');
    if (workspaceSurface.type === 'main' && !isDefined(objectMetadataItem))
      navigateApp(AppPath.NotFound);
  }, [
    objectMetadataItem,
    navigateApp,
    objectNamePlural,
    updatedObjectNamePlural,
    setUpdatedObjectNamePlural,
    workspaceSurface.type,
  ]);

  if (!isDefined(objectMetadataItem)) {
    return workspaceSurface.type === 'side-panel' ? (
      <WorkspaceRouteUnavailable />
    ) : null;
  }

  const tabs = [
    {
      id: SETTINGS_OBJECT_DETAIL_TABS.TABS_IDS.FIELDS,
      title: t`Fields`,
      Icon: IconListDetails,
      hide: false,
    },
    {
      id: SETTINGS_OBJECT_DETAIL_TABS.TABS_IDS.LAYOUT,
      title: t`Layout`,
      Icon: IconAppWindow,
      hide:
        objectMetadataItem.isRemote ||
        objectMetadataItem.nameSingular === CoreObjectNameSingular.Dashboard,
    },
  ];

  const renderActiveTabContent = () => {
    switch (activeTabId) {
      case SETTINGS_OBJECT_DETAIL_TABS.TABS_IDS.FIELDS:
        return <ObjectFields objectMetadataItem={objectMetadataItem} />;
      case SETTINGS_OBJECT_DETAIL_TABS.TABS_IDS.LAYOUT:
        return <ObjectLayout objectMetadataItem={objectMetadataItem} />;
      default:
        return <></>;
    }
  };

  return (
    <SettingsPageLayout
      title={objectMetadataItem.labelPlural}
      icon={<ObjectMetadataIcon objectMetadataItem={objectMetadataItem} />}
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        {
          children: t`Objects`,
          href: getSettingsPath(SettingsPath.Objects),
        },
        {
          children: objectMetadataItem.labelPlural,
        },
      ]}
      actionButton={
        <>
          <NavigationButton
            startIcon={<IconArrowUpRight />}
            size="sm"
            to={getAppPath(AppPath.RecordIndexPage, {
              objectNamePlural: objectMetadataItem.namePlural,
            })}
            variant="ghost"
          >{t`See records`}</NavigationButton>
        </>
      }
      secondaryBar={
        <SettingsTabBar
          aria-label={t`Object settings`}
          tabs={tabs}
          componentInstanceId={tabsComponentInstanceId}
        />
      }
    >
      <SettingsPageContainer>
        <StyledContentContainer>
          {renderActiveTabContent()}
        </StyledContentContainer>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
