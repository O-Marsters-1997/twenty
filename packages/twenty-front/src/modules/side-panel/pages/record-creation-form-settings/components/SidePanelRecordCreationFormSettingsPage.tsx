import { useObjectMetadataItemById } from '@/object-metadata/hooks/useObjectMetadataItemById';
import { useRecordFormFields } from '@/object-record/record-form/hooks/useRecordFormFields';
import { type RecordFormField } from '@/object-record/record-form/types/RecordFormField';
import { isFieldMetadataItemEligibleForRecordForm } from '@/object-record/record-form/utils/isFieldMetadataItemEligibleForRecordForm';
import { useUpdatePageLayoutWidgetsIsActive } from '@/page-layout/hooks/useUpdatePageLayoutWidgetsIsActive';
import { getSettingsFieldTypeConfig } from '@/settings/data-model/utils/getSettingsFieldTypeConfig';
import { isFieldTypeSupportedInSettings } from '@/settings/data-model/utils/isFieldTypeSupportedInSettings';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { recordCreationFormSettingsObjectMetadataIdComponentState } from '@/side-panel/pages/record-creation-form-settings/states/recordCreationFormSettingsObjectMetadataIdComponentState';
import { computePageLayoutWidgetIsActiveUpdates } from '@/side-panel/pages/record-creation-form-settings/utils/computePageLayoutWidgetIsActiveUpdates';
import { SidePanelPageComponentInstanceContext } from '@/side-panel/states/contexts/SidePanelPageComponentInstanceContext';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { MenuItem } from 'twenty-ui/components/navigation';
import { IconEye, IconEyeOff, useIcons } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  content: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0',
    overflowY: 'auto',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const SidePanelRecordCreationFormSettingsPage = () => {
  const recordCreationFormSettingsObjectMetadataId = useAtomComponentStateValue(
    recordCreationFormSettingsObjectMetadataIdComponentState,
  );

  if (!isDefined(recordCreationFormSettingsObjectMetadataId)) {
    return null;
  }

  return (
    <SidePanelRecordCreationFormSettings
      objectMetadataId={recordCreationFormSettingsObjectMetadataId}
    />
  );
};

const SidePanelRecordCreationFormSettings = ({
  objectMetadataId,
}: {
  objectMetadataId: string;
}) => {
  const { t, i18n } = useLingui();
  const { getIcon } = useIcons();
  const { objectMetadataItem } = useObjectMetadataItemById({
    objectId: objectMetadataId,
  });
  const { recordFormFields } = useRecordFormFields({ objectMetadataItem });
  const configurableRecordFormFields = recordFormFields.filter(
    ({ fieldMetadataItem }) =>
      isFieldMetadataItemEligibleForRecordForm(fieldMetadataItem),
  );
  const { goBackFromSidePanel, removePageFromSidePanelHistory } =
    useSidePanelHistory();
  const sidePanelPageId = useAvailableComponentInstanceIdOrThrow(
    SidePanelPageComponentInstanceContext,
  );
  const { updatePageLayoutWidgetsIsActive } =
    useUpdatePageLayoutWidgetsIsActive();

  const [isVisibleByFieldMetadataId, setIsVisibleByFieldMetadataId] = useState<
    Record<string, boolean>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  const isRecordFormFieldVisible = (recordFormField: RecordFormField) =>
    isVisibleByFieldMetadataId[recordFormField.fieldMetadataItem.id] ??
    recordFormField.isVisible;

  const handleToggleVisibility = (recordFormField: RecordFormField) => {
    if (isSaving) {
      return;
    }

    setIsVisibleByFieldMetadataId((previousIsVisibleByFieldMetadataId) => ({
      ...previousIsVisibleByFieldMetadataId,
      [recordFormField.fieldMetadataItem.id]:
        !isRecordFormFieldVisible(recordFormField),
    }));
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    const pageLayoutWidgetIsActiveUpdates =
      computePageLayoutWidgetIsActiveUpdates({
        recordFormFields: configurableRecordFormFields,
        isVisibleByFieldMetadataId,
      });

    setIsSaving(true);

    const { status } = await updatePageLayoutWidgetsIsActive(
      pageLayoutWidgetIsActiveUpdates,
    );

    setIsSaving(false);

    if (status === 'successful') {
      removePageFromSidePanelHistory(sidePanelPageId);
    }
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.content)}>
        <SidePanelGroup heading={t`Fields`}>
          {configurableRecordFormFields.map((recordFormField) => {
            const { fieldMetadataItem } = recordFormField;
            const isVisible = isRecordFormFieldVisible(recordFormField);

            return (
              <MenuItem
                key={fieldMetadataItem.id}
                LeftIcon={getIcon(fieldMetadataItem.icon)}
                withIconContainer
                text={fieldMetadataItem.label}
                contextualText={
                  isFieldTypeSupportedInSettings(fieldMetadataItem.type)
                    ? i18n._(
                        getSettingsFieldTypeConfig(fieldMetadataItem.type)
                          .label,
                      )
                    : undefined
                }
                isIconDisplayedOnHoverOnly={false}
                onClick={() => handleToggleVisibility(recordFormField)}
                iconButtons={
                  <LightIconButton
                    aria-label={
                      isVisible
                        ? t`Hide ${fieldMetadataItem.label}`
                        : t`Show ${fieldMetadataItem.label}`
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleVisibility(recordFormField);
                    }}
                  >
                    {isVisible ? <IconEye /> : <IconEyeOff />}
                  </LightIconButton>
                }
              />
            );
          })}
        </SidePanelGroup>
      </div>
      <SidePanelFooter
        actions={[
          <Button
            key="cancel"
            size="sm"
            onClick={goBackFromSidePanel}
          >{t`Cancel`}</Button>,
          <Button
            key="save"
            size="sm"
            variant="solid"
            color="accent"
            loading={isSaving}
            onClick={handleSave}
          >{t`Save`}</Button>,
        ]}
      />
    </div>
  );
};
