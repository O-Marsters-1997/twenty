import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { RecordFieldListComponentInstanceContext } from '@/object-record/record-field-list/states/contexts/RecordFieldListComponentInstanceContext';
import { FieldDescriptionTooltipProvider } from '@/object-record/record-field/ui/components/FieldDescriptionTooltipProvider';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { FieldsWidgetCellEditModePortal } from '@/page-layout/widgets/fields/components/FieldsWidgetCellEditModePortal';
import { FieldsWidgetCellHoveredPortal } from '@/page-layout/widgets/fields/components/FieldsWidgetCellHoveredPortal';
import { FieldsWidgetFieldList } from '@/page-layout/widgets/fields/components/FieldsWidgetFieldList';
import { FieldsWidgetGroupContainer } from '@/page-layout/widgets/fields/components/FieldsWidgetGroupContainer';
import { useFieldsWidgetGroupsForDisplay } from '@/page-layout/widgets/fields/hooks/useFieldsWidgetGroupsForDisplay';
import { useFieldsWidgetHiddenFieldsForDisplay } from '@/page-layout/widgets/fields/hooks/useFieldsWidgetHiddenFieldsForDisplay';
import { AnimatedPlaceholder } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/AnimatedPlaceholder';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import { StyledWidgetScrollContainer } from '@/ui/layout/components/WidgetContentContainer';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { SidePanelProvider } from '@/ui/layout/side-panel/contexts/SidePanelContext';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';

import { themeCssVariables } from 'twenty-ui/theme';
import { type FieldsConfiguration } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { border, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  propertyBox: {
    alignSelf: 'stretch',
    borderTopLeftRadius: border['--t-border-radius-sm'],
    borderTopRightRadius: border['--t-border-radius-sm'],
    borderBottomRightRadius: border['--t-border-radius-sm'],
    borderBottomLeftRadius: border['--t-border-radius-sm'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
  },
});

const StyledInlineFieldsPropertyBox = styled.div<{
  hasMoreGroup: boolean;
}>`
  align-self: stretch;
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding-bottom: ${({ hasMoreGroup }) =>
    hasMoreGroup ? themeCssVariables.spacing[3] : '0'};
  padding-top: 0;
`;

type FieldsWidgetProps = {
  widget: PageLayoutWidget;
};

export const FieldsWidget = ({ widget }: FieldsWidgetProps) => {
  const targetRecord = useTargetRecord();
  const isInSidePanel = useWorkspaceSurface().type === 'side-panel';

  const instanceId = `fields-${widget.id}-${targetRecord.id}${isInSidePanel ? '-side-panel' : ''}`;

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: targetRecord.targetObjectNameSingular,
  });

  const fieldsConfiguration = widget.configuration as FieldsConfiguration;

  const { groups, displayMode } = useFieldsWidgetGroupsForDisplay({
    widgetId: widget.id,
    viewId: fieldsConfiguration.viewId ?? null,
    objectNameSingular: targetRecord.targetObjectNameSingular,
  });

  const { hiddenFields } = useFieldsWidgetHiddenFieldsForDisplay({
    widgetId: widget.id,
    viewId: fieldsConfiguration.viewId ?? null,
    objectNameSingular: targetRecord.targetObjectNameSingular,
  });

  const shouldShowHiddenFields =
    fieldsConfiguration.shouldAllowUserToSeeHiddenFields === true &&
    hiddenFields.length > 0;

  const visibleFields = groups.flatMap((group) => group.fields);

  const hiddenFieldsWithOffsetGlobalIndex = shouldShowHiddenFields
    ? hiddenFields.map((field) => ({
        ...field,
        globalIndex: field.globalIndex + visibleFields.length,
      }))
    : [];

  const flattenedFieldMetadataItems = [
    ...visibleFields.map((field) => field.fieldMetadataItem),
    ...hiddenFieldsWithOffsetGlobalIndex.map(
      (field) => field.fieldMetadataItem,
    ),
  ];

  const hasFieldsToDisplay = groups.length > 0;

  const shouldDisplayGroupHeaders =
    displayMode === 'grouped' && groups.length > 1;

  if (!hasFieldsToDisplay) {
    return (
      <SidePanelProvider value={{ isInSidePanel }}>
        <StyledWidgetScrollContainer>
          <EmptyState.Root>
            <AnimatedPlaceholder type="noRecord" />
            <EmptyState.Content>
              <EmptyState.Title>{t`No fields to display`}</EmptyState.Title>
              <EmptyState.Description>
                {t`Configure this widget to display fields`}
              </EmptyState.Description>
            </EmptyState.Content>
          </EmptyState.Root>
        </StyledWidgetScrollContainer>
      </SidePanelProvider>
    );
  }

  return (
    <FieldDescriptionTooltipProvider>
      <StyledWidgetScrollContainer>
        <RecordFieldListComponentInstanceContext.Provider
          value={{
            instanceId,
          }}
        >
          {shouldDisplayGroupHeaders ? (
            groups.map((group) => (
              <FieldsWidgetGroupContainer key={group.id} title={group.name}>
                <div {...stylex.props(styles.propertyBox)}>
                  <FieldsWidgetFieldList
                    fields={group.fields}
                    instanceId={instanceId}
                  />
                </div>
              </FieldsWidgetGroupContainer>
            ))
          ) : (
            <StyledInlineFieldsPropertyBox
              hasMoreGroup={shouldShowHiddenFields}
            >
              <FieldsWidgetFieldList
                fields={visibleFields}
                instanceId={instanceId}
              />
            </StyledInlineFieldsPropertyBox>
          )}

          {shouldShowHiddenFields && (
            <FieldsWidgetGroupContainer
              title={t`More (${hiddenFieldsWithOffsetGlobalIndex.length})`}
              defaultExpanded={false}
            >
              <div {...stylex.props(styles.propertyBox)}>
                <FieldsWidgetFieldList
                  fields={hiddenFieldsWithOffsetGlobalIndex}
                  instanceId={instanceId}
                />
              </div>
            </FieldsWidgetGroupContainer>
          )}

          <FieldsWidgetCellHoveredPortal
            objectMetadataItem={objectMetadataItem}
            recordId={targetRecord.id}
            flattenedFieldMetadataItems={flattenedFieldMetadataItems}
          />
          <FieldsWidgetCellEditModePortal
            objectMetadataItem={objectMetadataItem}
            recordId={targetRecord.id}
            flattenedFieldMetadataItems={flattenedFieldMetadataItems}
          />
        </RecordFieldListComponentInstanceContext.Provider>
      </StyledWidgetScrollContainer>
    </FieldDescriptionTooltipProvider>
  );
};
