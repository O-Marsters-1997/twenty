import { PageLayoutGridLayout } from '@/page-layout/components/PageLayoutGridLayout';
import { PageLayoutVerticalList } from '@/page-layout/components/PageLayoutVerticalList';
import { usePageLayoutContentContext } from '@/page-layout/contexts/PageLayoutContentContext';
import { useCurrentPageLayoutOrThrow } from '@/page-layout/hooks/useCurrentPageLayoutOrThrow';
import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { usePageLayoutTabWithVisibleWidgetsOrThrow } from '@/page-layout/hooks/usePageLayoutTabWithVisibleWidgetsOrThrow';
import { RecordPageAddWidgetSection } from '@/page-layout/widgets/components/RecordPageAddWidgetSection';
import { RecordPageWidgetInsertionSeparator } from '@/page-layout/widgets/components/RecordPageWidgetInsertionSeparator';
import { StandaloneWidgetPlaceholder } from '@/page-layout/widgets/components/StandaloneWidgetPlaceholder';
import { isViewportFillingWidget } from '@/page-layout/widgets/utils/isViewportFillingWidget';
import { isDefined } from 'twenty-shared/utils';
import {
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  emptyStandalonePageContainer: {
    display: 'grid',
    height: '100%',
  },
});

export const PageLayoutContent = () => {
  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const { layoutMode, tabId } = usePageLayoutContentContext();

  const activeTab = usePageLayoutTabWithVisibleWidgetsOrThrow(tabId);
  const firstWidget = activeTab.widgets[0];

  const { currentPageLayout } = useCurrentPageLayoutOrThrow();

  const isRecordPageLayout =
    currentPageLayout.type === PageLayoutType.RECORD_PAGE;

  const isGridLayout = layoutMode === PageLayoutTabLayoutMode.GRID;

  const isEmptyStandalonePage =
    currentPageLayout.type === PageLayoutType.STANDALONE_PAGE &&
    activeTab.widgets.length === 0;

  if (isEmptyStandalonePage) {
    return (
      <div {...stylex.props(styles.emptyStandalonePageContainer)}>
        <StandaloneWidgetPlaceholder />
      </div>
    );
  }

  if (isGridLayout) {
    return <PageLayoutGridLayout tabId={tabId} />;
  }

  return (
    <PageLayoutVerticalList
      isInEditMode={isPageLayoutInEditMode && isRecordPageLayout}
      widgets={activeTab.widgets}
      leadingElement={
        isRecordPageLayout &&
        isDefined(firstWidget) &&
        isViewportFillingWidget(firstWidget) ? (
          <RecordPageAddWidgetSection
            insertionContext={{
              targetWidgetId: firstWidget.id,
              direction: 'above',
            }}
          />
        ) : undefined
      }
      trailingElement={
        isRecordPageLayout ? <RecordPageAddWidgetSection /> : undefined
      }
      renderWidgetSeparator={
        isRecordPageLayout
          ? (widget) => <RecordPageWidgetInsertionSeparator widget={widget} />
          : undefined
      }
    />
  );
};
