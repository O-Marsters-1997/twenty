import { PageLayoutContent } from '@/page-layout/components/PageLayoutContent';
import { PageLayoutScrollResetEffect } from '@/page-layout/components/PageLayoutScrollResetEffect';
import { PageLayoutContentProvider } from '@/page-layout/contexts/PageLayoutContentContext';
import { useCurrentPageLayout } from '@/page-layout/hooks/useCurrentPageLayout';
import { usePageLayoutTabWithVisibleWidgetsOrThrow } from '@/page-layout/hooks/usePageLayoutTabWithVisibleWidgetsOrThrow';
import { getScrollWrapperInstanceIdFromPageLayoutAndRecord } from '@/page-layout/utils/getScrollWrapperInstanceIdFromPageLayoutAndRecord';
import { getTabLayoutMode } from '@/page-layout/utils/getTabLayoutMode';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { PageLayoutType } from '~/generated-metadata/graphql';
import { background, borderColor } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import '~/third-party-styles/page-layout.css';

type PageLayoutLeftPanelProps = {
  pageLayoutId: string;
  pinnedLeftTabId: string;
};

export const PageLayoutLeftPanel = ({
  pageLayoutId,
  pinnedLeftTabId,
}: PageLayoutLeftPanelProps) => {
  const { currentPageLayout } = useCurrentPageLayout();
  const targetRecordIdentifier = useTargetRecord();
  const { layoutType } = useLayoutRenderingContext();
  const pinnedTab = usePageLayoutTabWithVisibleWidgetsOrThrow(pinnedLeftTabId);

  const scrollWrapperInstanceId = useWorkspaceSurfaceScopedComponentInstanceId(
    getScrollWrapperInstanceIdFromPageLayoutAndRecord({
      pageLayoutId,
      layoutType,
      targetRecordIdentifier,
      scrollWrapperArea: 'left-panel',
      pageLayoutTabId: pinnedLeftTabId,
    }),
  );
  if (currentPageLayout?.type !== PageLayoutType.RECORD_PAGE) {
    return null;
  }

  const layoutMode = getTabLayoutMode({
    tab: pinnedTab,
    pageLayoutType: currentPageLayout.type,
  });

  return (
    <div {...stylex.props(styles.container)}>
      <PageLayoutScrollResetEffect
        pageLayoutTabId={pinnedLeftTabId}
        scrollWrapperInstanceId={scrollWrapperInstanceId}
        targetRecordId={targetRecordIdentifier.id}
      />

      {/* The pinned left panel is always a column of cards, even with a single
          widget: solo presentation is a main-tab-area concept. */}
      <PageLayoutContentProvider
        value={{
          tabId: pinnedLeftTabId,
          layoutMode,
          presentation: 'stack',
        }}
      >
        <ScrollWrapper
          className="page-layout-scroll-wrapper"
          componentInstanceId={scrollWrapperInstanceId}
          defaultEnableXScroll={false}
          defaultEnableYScroll={true}
        >
          <PageLayoutContent />
        </ScrollWrapper>
      </PageLayoutContentProvider>
    </div>
  );
};

const styles = stylex.create({
  container: {
    '--record-card-background-color': background['--t-background-secondary'],
    backgroundColor: 'var(--record-card-background-color)',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'minmax(0, 1fr)',
    borderBottomLeftRadius: 8,
    borderRightColor: borderColor['--t-border-color-medium'],
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    height: '100%',
  },
});
