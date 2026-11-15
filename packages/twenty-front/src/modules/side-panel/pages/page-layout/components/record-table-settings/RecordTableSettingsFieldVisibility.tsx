import { ApplicationStackIcon } from '@/applications/components/ApplicationStackIcon';
import { useRecordTableWidgetViewFieldItems } from '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetViewFieldItems';
import { useReorderRecordTableWidgetFields } from '@/page-layout/widgets/record-table/hooks/useReorderRecordTableWidgetFields';
import { useToggleRecordTableWidgetFieldVisibility } from '@/page-layout/widgets/record-table/hooks/useToggleRecordTableWidgetFieldVisibility';
import { DraggableItem } from '@/ui/layout/draggable-list/components/DraggableItem';
import { DraggableList } from '@/ui/layout/draggable-list/components/DraggableList';
import { type DraggableListDropResult } from '@/ui/layout/draggable-list/types/DraggableListDropResult';
import { t } from '@lingui/core/macro';
import { useMemo } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { MenuItemDraggable } from 'twenty-ui/components/navigation';
import { IconEye, IconEyeOff, useIcons } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fieldListContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  sectionLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    textTransform: 'uppercase',
  },
});

type RecordTableSettingsFieldVisibilityProps = {
  viewId: string;
  widgetId: string;
  pageLayoutId: string;
};

export const RecordTableSettingsFieldVisibility = ({
  viewId,
  widgetId,
  pageLayoutId,
}: RecordTableSettingsFieldVisibilityProps) => {
  const { recordTableWidgetViewFieldItems } =
    useRecordTableWidgetViewFieldItems({ viewId, widgetId, pageLayoutId });

  const { toggleRecordTableWidgetFieldVisibility } =
    useToggleRecordTableWidgetFieldVisibility({ pageLayoutId, widgetId });

  const { reorderRecordTableWidgetFields } = useReorderRecordTableWidgetFields({
    pageLayoutId,
    widgetId,
  });

  const { getIcon } = useIcons();

  const visibleFieldItems = useMemo(
    () =>
      recordTableWidgetViewFieldItems.filter(
        (item) => item.viewField.isVisible,
      ),
    [recordTableWidgetViewFieldItems],
  );

  const hiddenFieldItems = useMemo(
    () =>
      recordTableWidgetViewFieldItems.filter(
        (item) => !item.viewField.isVisible,
      ),
    [recordTableWidgetViewFieldItems],
  );

  const handleDragEnd = (result: DraggableListDropResult) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    reorderRecordTableWidgetFields(
      source.index,
      destination.index,
      visibleFieldItems,
    );
  };

  return (
    <div {...stylex.props(styles.fieldListContainer)}>
      <div {...stylex.props(styles.sectionLabel)}>Visible</div>
      {visibleFieldItems.length > 0 && (
        <DraggableList
          onDragEnd={handleDragEnd}
          draggableItems={
            <>
              {visibleFieldItems.map((fieldItem, index) => (
                <DraggableItem
                  key={fieldItem.viewField.id}
                  draggableId={fieldItem.viewField.id}
                  index={index}
                  itemComponent={
                    <MenuItemDraggable
                      LeftComponent={
                        <ApplicationStackIcon
                          Icon={getIcon(fieldItem.fieldMetadataItem.icon)}
                          applicationId={
                            fieldItem.fieldMetadataItem.applicationId
                          }
                        />
                      }
                      iconButtons={
                        <LightIconButton
                          aria-label={t`Hide field`}
                          onClick={() => {
                            toggleRecordTableWidgetFieldVisibility(
                              fieldItem.viewField.id,
                              false,
                            );
                          }}
                        >
                          <IconEyeOff />
                        </LightIconButton>
                      }
                      text={fieldItem.fieldMetadataItem.label}
                      gripMode="always"
                    />
                  }
                />
              ))}
            </>
          }
        />
      )}
      {hiddenFieldItems.length > 0 && (
        <>
          <div {...stylex.props(styles.sectionLabel)}>Hidden</div>
          {hiddenFieldItems.map((fieldItem) => (
            <MenuItemDraggable
              key={fieldItem.viewField.id}
              LeftComponent={
                <ApplicationStackIcon
                  Icon={getIcon(fieldItem.fieldMetadataItem.icon)}
                  applicationId={fieldItem.fieldMetadataItem.applicationId}
                />
              }
              iconButtons={
                <LightIconButton
                  aria-label={t`Show field`}
                  onClick={() => {
                    toggleRecordTableWidgetFieldVisibility(
                      fieldItem.viewField.id,
                      true,
                    );
                  }}
                >
                  <IconEye />
                </LightIconButton>
              }
              text={fieldItem.fieldMetadataItem.label}
              accent="placeholder"
              isDragDisabled
            />
          ))}
        </>
      )}
    </div>
  );
};
