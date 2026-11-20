import { RecordPageSidePanelCommandMenu } from '@/command-menu-item/components/RecordPageSidePanelCommandMenu';
import { RecordPageSidePanelPinnedCommandMenuItems } from '@/command-menu-item/components/RecordPageSidePanelPinnedCommandMenuItems';
import { RecordPageSidePanelWidgetCommandMenuItems } from '@/command-menu-item/components/RecordPageSidePanelWidgetCommandMenuItems';
import { InformationBannerDeletedRecord } from '@/information-banner/components/deleted-record/InformationBannerDeletedRecord';
import { RecordShowContainerContextStoreTargetedRecordsEffect } from '@/object-record/record-show/components/RecordShowContainerContextStoreTargetedRecordsEffect';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { PageLayoutRenderer } from '@/page-layout/components/PageLayoutRenderer';
import { usePageLayoutIdForRecord } from '@/page-layout/hooks/usePageLayoutIdForRecord';
import { PageLayoutIdContext } from '@/page-layout/states/currentPageLayoutIdState';
import { LayoutRenderingProvider } from '@/ui/layout/contexts/LayoutRenderingContext';
import { type TargetRecordIdentifier } from '@/ui/layout/contexts/TargetRecordIdentifier';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  showPageBannerContainer: {
    flexShrink: '0',
    zIndex: 1,
  },
  showPageRightContainer: {
    flex: '1',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'start',
    minHeight: '0',
    width: '100%',
  },
  contentContainer: {
    background: background['--t-background-primary'],
    flex: '1',
    minHeight: '0',
    overflowY: 'auto',
  },
});

export const PageLayoutRecordPageRenderer = ({
  targetRecordIdentifier,
  isRecordIdentifierBarHidden = false,
}: {
  targetRecordIdentifier: TargetRecordIdentifier;
  isRecordIdentifierBarHidden?: boolean;
}) => {
  const isInSidePanel = useWorkspaceSurface().type === 'side-panel';
  const recordDeletedAt = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: targetRecordIdentifier.id,
      fieldName: 'deletedAt',
    },
  ) as string | null;

  const { pageLayoutId } = usePageLayoutIdForRecord({
    id: targetRecordIdentifier.id,
    targetObjectNameSingular: targetRecordIdentifier.targetObjectNameSingular,
  });

  return (
    <PageLayoutIdContext.Provider value={pageLayoutId}>
      <RecordShowContainerContextStoreTargetedRecordsEffect
        recordId={targetRecordIdentifier.id}
      />

      {recordDeletedAt && (
        <div {...stylex.props(styles.showPageBannerContainer)}>
          <InformationBannerDeletedRecord
            recordId={targetRecordIdentifier.id}
            objectNameSingular={targetRecordIdentifier.targetObjectNameSingular}
          />
        </div>
      )}

      <div
        data-record-show-page-body=""
        {...stylex.props(styles.showPageRightContainer)}
      >
        <div {...stylex.props(styles.contentContainer)}>
          <LayoutRenderingProvider
            value={{
              targetRecordIdentifier: {
                id: targetRecordIdentifier.id,
                targetObjectNameSingular:
                  targetRecordIdentifier.targetObjectNameSingular,
              },
              layoutType:
                targetRecordIdentifier.targetObjectNameSingular ===
                CoreObjectNameSingular.Dashboard
                  ? PageLayoutType.DASHBOARD
                  : PageLayoutType.RECORD_PAGE,
              isRecordIdentifierBarHidden,
            }}
          >
            {isDefined(pageLayoutId) && (
              <PageLayoutRenderer pageLayoutId={pageLayoutId} />
            )}
          </LayoutRenderingProvider>
        </div>

        {isInSidePanel && (
          <SidePanelFooter
            actions={[
              <RecordPageSidePanelCommandMenu key="options" />,
              <RecordPageSidePanelWidgetCommandMenuItems key="widget" />,
              <RecordPageSidePanelPinnedCommandMenuItems key="pinned" />,
            ]}
          />
        )}
      </div>
    </PageLayoutIdContext.Provider>
  );
};
