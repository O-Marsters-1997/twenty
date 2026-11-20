import { ChartFiltersDeletedFieldsWarning } from '@/side-panel/pages/page-layout/components/ChartFiltersDeletedFieldsWarning';
import { ChartFiltersSettingsInitializeStateEffect } from '@/side-panel/pages/page-layout/components/ChartFiltersSettingsInitializeStateEffect';
import { usePageLayoutSidePanelTarget } from '@/side-panel/pages/page-layout/hooks/usePageLayoutSidePanelTarget';
import { useUpdateCurrentWidgetConfig } from '@/side-panel/pages/page-layout/hooks/useUpdateCurrentWidgetConfig';
import { type ChartWidget } from '@/side-panel/pages/page-layout/types/ChartWidget';
import { type ChartWidgetConfiguration } from '@/side-panel/pages/page-layout/types/ChartWidgetConfiguration';
import { dropChartRecordFiltersWithDeletedFields } from '@/side-panel/pages/page-layout/utils/dropChartRecordFiltersWithDeletedFields';
import { getChartFiltersSettingsInstanceId } from '@/side-panel/pages/page-layout/utils/getChartFiltersSettingsInstanceId';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { AdvancedFilterSidePanelContainer } from '@/object-record/advanced-filter/side-panel/components/AdvancedFilterSidePanelContainer';
import { RecordFilterGroupsComponentInstanceContext } from '@/object-record/record-filter-group/states/context/RecordFilterGroupsComponentInstanceContext';
import { currentRecordFilterGroupsComponentState } from '@/object-record/record-filter-group/states/currentRecordFilterGroupsComponentState';
import { RecordFiltersComponentInstanceContext } from '@/object-record/record-filter/states/context/RecordFiltersComponentInstanceContext';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { useAtomComponentStateCallbackState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateCallbackState';
import { t } from '@lingui/core/macro';
import { useStore } from 'jotai';
import { useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  chartFiltersPageContainer: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
  },
});

export type ChartFiltersSettingsProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  widget: ChartWidget;
};

export const ChartFiltersSettings = ({
  objectMetadataItem,
  widget,
}: ChartFiltersSettingsProps) => {
  const { instanceId } = getChartFiltersSettingsInstanceId({
    widgetId: widget.id,
    objectMetadataItemId: objectMetadataItem.id,
  });

  const { pageLayoutId } = usePageLayoutSidePanelTarget();

  const { updateCurrentWidgetConfig } =
    useUpdateCurrentWidgetConfig(pageLayoutId);

  const currentRecordFilters = useAtomComponentStateCallbackState(
    currentRecordFiltersComponentState,
    instanceId,
  );

  const currentRecordFilterGroups = useAtomComponentStateCallbackState(
    currentRecordFilterGroupsComponentState,
    instanceId,
  );

  const store = useStore();
  const chartWidgetConfiguration = widget.configuration;

  const validFieldMetadataIds = useMemo(
    () =>
      new Set(
        objectMetadataItem.fields
          .filter((fieldMetadataItem) => fieldMetadataItem.isActive)
          .map((fieldMetadataItem) => fieldMetadataItem.id),
      ),
    [objectMetadataItem.fields],
  );

  const handleFiltersUpdate = () => {
    const existingRecordFilters = store.get(currentRecordFilters);
    const existingRecordFilterGroups = store.get(currentRecordFilterGroups);

    const {
      recordFilters: sanitizedRecordFilters,
      recordFilterGroups: sanitizedRecordFilterGroups,
    } = dropChartRecordFiltersWithDeletedFields({
      chartFilters: {
        recordFilters: existingRecordFilters,
        recordFilterGroups: existingRecordFilterGroups,
      },
      validFieldMetadataIds,
    });

    updateCurrentWidgetConfig({
      objectMetadataId: objectMetadataItem.id,
      configToUpdate: {
        filter: {
          recordFilters: sanitizedRecordFilters,
          recordFilterGroups: sanitizedRecordFilterGroups,
        },
      } satisfies Partial<ChartWidgetConfiguration>,
    });
  };

  return (
    <div {...stylex.props(styles.chartFiltersPageContainer)}>
      <div>
        <InputLabel>{t`Conditions`}</InputLabel>
        <RecordFilterGroupsComponentInstanceContext.Provider
          value={{ instanceId }}
        >
          <RecordFiltersComponentInstanceContext.Provider
            value={{ instanceId }}
          >
            <ChartFiltersDeletedFieldsWarning
              validFieldMetadataIds={validFieldMetadataIds}
            />
            <AdvancedFilterSidePanelContainer
              onUpdate={handleFiltersUpdate}
              objectMetadataItem={objectMetadataItem}
              isWorkflowFindRecords={false}
            />
            <ChartFiltersSettingsInitializeStateEffect
              initialChartFilters={chartWidgetConfiguration.filter}
            />
          </RecordFiltersComponentInstanceContext.Provider>
        </RecordFilterGroupsComponentInstanceContext.Provider>
      </div>
    </div>
  );
};
