import { RecordIdentifierBarCreatedAt } from '@/object-record/record-show/components/RecordIdentifierBarCreatedAt';
import { RecordIdentifierBarTitle } from '@/object-record/record-show/components/RecordIdentifierBarTitle';
import { PageLayoutWidgetDndProvider } from '@/page-layout/components/dnd/PageLayoutWidgetDndProvider';
import { PageLayoutContent } from '@/page-layout/components/PageLayoutContent';
import { PageLayoutEditModeProvider } from '@/page-layout/components/PageLayoutEditModeProvider';
import { PageLayoutInitializationQueryEffect } from '@/page-layout/components/PageLayoutInitializationQueryEffect';
import { PageLayoutRecordPageCustomizationSessionRegistrationEffect } from '@/page-layout/components/PageLayoutRecordPageCustomizationSessionRegistrationEffect';
import { PageLayoutContentProvider } from '@/page-layout/contexts/PageLayoutContentContext';
import { useCurrentPageLayoutOrThrow } from '@/page-layout/hooks/useCurrentPageLayoutOrThrow';
import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { usePageLayoutTabWithVisibleWidgetsOrThrow } from '@/page-layout/hooks/usePageLayoutTabWithVisibleWidgetsOrThrow';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { pageLayoutIsInitializedComponentState } from '@/page-layout/states/pageLayoutIsInitializedComponentState';
import { RecordTableWidgetViewDraftsInitializationEffect } from '@/page-layout/widgets/record-table/components/RecordTableWidgetViewDraftsInitializationEffect';
import { getTabLayoutMode } from '@/page-layout/utils/getTabLayoutMode';
import { getTabListInstanceIdFromPageLayoutAndRecord } from '@/page-layout/utils/getTabListInstanceIdFromPageLayoutAndRecord';
import { getTabPresentation } from '@/page-layout/utils/getTabPresentation';
import { sortTabsByPosition } from '@/page-layout/utils/sortTabsByPosition';
import { PageLayoutSidePanelTargetProvider } from '@/side-panel/pages/page-layout/components/PageLayoutSidePanelTargetProvider';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { TabListComponentInstanceContext } from '@/ui/layout/tab-list/states/contexts/TabListComponentInstanceContext';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isDefined } from 'twenty-shared/utils';
import {
  spacing,
  background,
  borderColor,
} from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

type PageLayoutSingleTabRendererProps = {
  pageLayoutId: string;
};

const PageLayoutSingleTabRendererContent = () => {
  const pageLayoutIsInitialized = useAtomComponentStateValue(
    pageLayoutIsInitializedComponentState,
  );

  if (!pageLayoutIsInitialized) {
    return null;
  }

  return <PageLayoutSingleTabRendererInner />;
};

const PageLayoutSingleTabRendererInner = () => {
  const { currentPageLayout } = useCurrentPageLayoutOrThrow();
  const targetRecordIdentifier = useTargetRecord();

  const sortedActiveTabs = sortTabsByPosition(
    currentPageLayout.tabs.filter((tab) => tab.isActive),
  );
  const firstTab = sortedActiveTabs.at(0);

  return (
    <>
      <div {...stylex.props(styles.recordIdentifierBar)}>
        <RecordIdentifierBarTitle
          objectNameSingular={targetRecordIdentifier.targetObjectNameSingular}
          objectRecordId={targetRecordIdentifier.id}
        />
        <RecordIdentifierBarCreatedAt
          objectRecordId={targetRecordIdentifier.id}
        />
      </div>

      {isDefined(firstTab) && (
        <PageLayoutSingleTabRendererTabContent firstTabId={firstTab.id} />
      )}
    </>
  );
};

type PageLayoutSingleTabRendererTabContentProps = {
  firstTabId: string;
};

const PageLayoutSingleTabRendererTabContent = ({
  firstTabId,
}: PageLayoutSingleTabRendererTabContentProps) => {
  const { currentPageLayout } = useCurrentPageLayoutOrThrow();
  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const firstTabWithVisibleWidgets =
    usePageLayoutTabWithVisibleWidgetsOrThrow(firstTabId);

  const layoutMode = getTabLayoutMode({
    tab: firstTabWithVisibleWidgets,
    pageLayoutType: currentPageLayout.type,
  });

  const presentation = getTabPresentation({
    widgets: firstTabWithVisibleWidgets.widgets,
    layoutMode,
    isInEditMode: isPageLayoutInEditMode,
  });

  return (
    <PageLayoutContentProvider
      value={{
        tabId: firstTabId,
        layoutMode,
        presentation,
      }}
    >
      <PageLayoutWidgetDndProvider>
        <PageLayoutContent />
      </PageLayoutWidgetDndProvider>
    </PageLayoutContentProvider>
  );
};

export const PageLayoutSingleTabRenderer = ({
  pageLayoutId,
}: PageLayoutSingleTabRendererProps) => {
  const { targetRecordIdentifier, layoutType } = useLayoutRenderingContext();

  const pageLayoutComponentInstanceId =
    useWorkspaceSurfaceScopedComponentInstanceId(pageLayoutId);

  const tabListInstanceId = useWorkspaceSurfaceScopedComponentInstanceId(
    getTabListInstanceIdFromPageLayoutAndRecord({
      pageLayoutId,
      layoutType,
      targetRecordIdentifier,
    }),
  );

  return (
    <PageLayoutComponentInstanceContext.Provider
      value={{
        instanceId: pageLayoutComponentInstanceId,
      }}
    >
      <TabListComponentInstanceContext.Provider
        value={{
          instanceId: tabListInstanceId,
        }}
      >
        <PageLayoutSidePanelTargetProvider
          pageLayoutId={pageLayoutComponentInstanceId}
          targetRecordIdentifier={targetRecordIdentifier}
        >
          <PageLayoutEditModeProvider
            layoutType={layoutType}
            pageLayoutId={pageLayoutId}
          >
            <PageLayoutInitializationQueryEffect pageLayoutId={pageLayoutId} />
            <PageLayoutRecordPageCustomizationSessionRegistrationEffect />
            <RecordTableWidgetViewDraftsInitializationEffect />
            <PageLayoutSingleTabRendererContent />
          </PageLayoutEditModeProvider>
        </PageLayoutSidePanelTargetProvider>
      </TabListComponentInstanceContext.Provider>
    </PageLayoutComponentInstanceContext.Provider>
  );
};

const styles = stylex.create({
  recordIdentifierBar: {
    gap: spacing['--t-spacing-2'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-3'],
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: '40px',
    minWidth: 0,
  },
});
