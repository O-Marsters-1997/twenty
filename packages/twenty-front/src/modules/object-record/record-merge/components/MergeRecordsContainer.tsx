import { t } from '@lingui/core/macro';
import { TabListRoot } from '@/ui/layout/tab-list/components/TabListRoot';
import { Tabs } from 'twenty-ui/primitives/navigation';
import { useRef } from 'react';

import { ShowPageContainer } from '@/ui/layout/page/components/ShowPageContainer';
import { SidePanelProvider } from '@/ui/layout/side-panel/contexts/SidePanelContext';
import { TabList } from '@/ui/layout/tab-list/components/TabList';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';

import { useMergeRecordsContainerTabs } from '@/object-record/record-merge/hooks/useMergeRecordsContainerTabs';
import { useMergeRecordsSelectedRecords } from '@/object-record/record-merge/hooks/useMergeRecordsSelectedRecords';
import { MergeRecordsTabId } from '@/object-record/record-merge/types/MergeRecordsTabId';
import { MergeRecordsContentScrollResetEffect } from '@/object-record/record-merge/components/MergeRecordsContentScrollResetEffect';
import { SidePanelPageComponentInstanceContext } from '@/side-panel/states/contexts/SidePanelPageComponentInstanceContext';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { MergePreviewTab } from './MergePreviewTab';
import { MergeRecordTab } from './MergeRecordTab';
import { MergeRecordsFooter } from './MergeRecordsFooter';
import { MergeSettingsTab } from './MergeSettingsTab';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  showPageRightContainer: {
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'start',
    height: '100%',
    width: '100%',
  },
  tabListContainer: {
    backgroundColor: background['--t-background-secondary'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  contentContainer: {
    background: background['--t-background-primary'],
    flex: '1',
    overflowY: 'auto',
  },
});

type MergeRecordsContainerProps = {
  objectNameSingular: string;
};

export const MergeRecordsContainer = ({
  objectNameSingular,
}: MergeRecordsContainerProps) => {
  const { selectedRecords } = useMergeRecordsSelectedRecords();

  const { tabs } = useMergeRecordsContainerTabs(selectedRecords);

  const instanceId = useAvailableComponentInstanceIdOrThrow(
    SidePanelPageComponentInstanceContext,
  );
  const activeTabId = useAtomComponentStateValue(
    activeTabIdComponentState,
    instanceId,
  );

  const contentContainerRef = useRef<HTMLDivElement>(null);

  return (
    <SidePanelProvider value={{ isInSidePanel: true }}>
      <ShowPageContainer>
        <div {...stylex.props(styles.showPageRightContainer)}>
          <TabListRoot componentInstanceId={instanceId}>
            <div {...stylex.props(styles.tabListContainer)}>
              <TabList
                aria-label={t`Merge records`}
                tabs={tabs}
                behaveAsLinks={false}
                componentInstanceId={instanceId}
              />
            </div>
            <MergeRecordsContentScrollResetEffect
              activeTabId={activeTabId}
              contentContainerRef={contentContainerRef}
            />
            <Tabs.Panel
              value={activeTabId ?? ''}
              render={
                <div
                  ref={contentContainerRef}
                  {...stylex.props(styles.contentContainer)}
                />
              }
            >
              {activeTabId === MergeRecordsTabId.MERGE_PREVIEW && (
                <MergePreviewTab objectNameSingular={objectNameSingular} />
              )}
              {activeTabId === MergeRecordsTabId.SETTINGS && (
                <MergeSettingsTab />
              )}
              {selectedRecords.some((record) => record.id === activeTabId) && (
                <MergeRecordTab
                  objectNameSingular={objectNameSingular}
                  recordId={activeTabId || ''}
                />
              )}
            </Tabs.Panel>
          </TabListRoot>
          <MergeRecordsFooter objectNameSingular={objectNameSingular} />
        </div>
      </ShowPageContainer>
    </SidePanelProvider>
  );
};
