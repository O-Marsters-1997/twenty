import { getWidgetConfigurationViewId } from '@/page-layout/utils/getWidgetConfigurationViewId';
import { RecordTableSettingsFieldVisibility } from '@/side-panel/pages/page-layout/components/record-table-settings/RecordTableSettingsFieldVisibility';
import { usePageLayoutSidePanelTarget } from '@/side-panel/pages/page-layout/hooks/usePageLayoutSidePanelTarget';
import { useWidgetInEditMode } from '@/side-panel/pages/page-layout/hooks/useWidgetInEditMode';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const SidePanelFieldRelationTableFieldsSubPage = () => {
  const { pageLayoutId } = usePageLayoutSidePanelTarget();
  const { widgetInEditMode } = useWidgetInEditMode(pageLayoutId);

  if (!isDefined(widgetInEditMode)) {
    return null;
  }

  const viewId = getWidgetConfigurationViewId(widgetInEditMode.configuration);

  if (!isDefined(viewId)) {
    return null;
  }

  return (
    <div {...stylex.props(styles.container)}>
      <RecordTableSettingsFieldVisibility
        viewId={viewId}
        widgetId={widgetInEditMode.id}
        pageLayoutId={pageLayoutId}
      />
    </div>
  );
};
