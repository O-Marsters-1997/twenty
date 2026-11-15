import { useTemporaryFieldsConfiguration } from '@/page-layout/hooks/useTemporaryFieldsConfiguration';
import { FieldsConfigurationEditor } from '@/page-layout/widgets/fields/components/FieldsConfigurationEditor';
import { FieldsWidgetGroupsDraftInitializationEffect } from '@/page-layout/widgets/fields/components/FieldsWidgetGroupsDraftInitializationEffect';
import { usePageLayoutSidePanelTarget } from '@/side-panel/pages/page-layout/hooks/usePageLayoutSidePanelTarget';
import { useWidgetInEditMode } from '@/side-panel/pages/page-layout/hooks/useWidgetInEditMode';
import { isDefined } from 'twenty-shared/utils';
import {
  type FieldsConfiguration,
  WidgetConfigurationType,
} from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fieldsLayoutContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

export const SidePanelFieldsLayoutSubPage = () => {
  const { pageLayoutId } = usePageLayoutSidePanelTarget();

  const { widgetInEditMode } = useWidgetInEditMode(pageLayoutId);
  const temporaryFieldsConfiguration = useTemporaryFieldsConfiguration();

  if (!isDefined(widgetInEditMode)) {
    return null;
  }

  const widgetConfiguration = widgetInEditMode.configuration;

  const resolvedFieldsConfiguration: FieldsConfiguration =
    isDefined(widgetConfiguration) &&
    widgetConfiguration.configurationType === WidgetConfigurationType.FIELDS
      ? (widgetConfiguration as FieldsConfiguration)
      : temporaryFieldsConfiguration;

  return (
    <div {...stylex.props(styles.fieldsLayoutContainer)}>
      <FieldsWidgetGroupsDraftInitializationEffect
        viewId={resolvedFieldsConfiguration.viewId ?? null}
        pageLayoutId={pageLayoutId}
        widgetId={widgetInEditMode.id}
      />
      <FieldsConfigurationEditor
        pageLayoutId={pageLayoutId}
        widgetId={widgetInEditMode.id}
      />
    </div>
  );
};
