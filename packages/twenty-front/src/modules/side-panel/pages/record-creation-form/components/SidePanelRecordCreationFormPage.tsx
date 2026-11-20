import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { HeaderIdentifier } from '@/ui/layout/page/components/HeaderIdentifier';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { SidePanelOptionsDropdown } from '@/side-panel/components/SidePanelOptionsDropdown';
import { SIDE_PANEL_FOCUS_ID } from '@/side-panel/constants/SidePanelFocusId';
import { currentFocusIdSelector } from '@/ui/utilities/focus/states/currentFocusIdSelector';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useObjectMetadataItemById } from '@/object-metadata/hooks/useObjectMetadataItemById';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getFieldPermissions } from '@/object-metadata/utils/getFieldPermissions';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { RecordFormFieldInputs } from '@/object-record/record-form/components/RecordFormFieldInputs';
import { useRecordCreationFormSettle } from '@/object-record/record-form/hooks/useRecordCreationFormSettle';
import { useRecordFormFields } from '@/object-record/record-form/hooks/useRecordFormFields';
import { computeRecordFormCreateRecordInput } from '@/object-record/record-form/utils/computeRecordFormCreateRecordInput';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useOpenRecordCreationFormSettingsInSidePanel } from '@/side-panel/hooks/useOpenRecordCreationFormSettingsInSidePanel';
import { recordCreationFormAreHiddenFieldsShownComponentState } from '@/side-panel/pages/record-creation-form/states/recordCreationFormAreHiddenFieldsShownComponentState';
import { recordCreationFormDraftComponentState } from '@/side-panel/pages/record-creation-form/states/recordCreationFormDraftComponentState';
import { recordCreationFormRequestComponentState } from '@/side-panel/pages/record-creation-form/states/recordCreationFormRequestComponentState';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useId, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Key } from 'ts-key-enum';
import { type JsonValue } from 'type-fest';
import { PermissionFlagType } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { LightButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import {
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconPlus,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
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
    gap: spacing['--t-spacing-4'],
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0',
    overflowY: 'auto',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
  hiddenFieldsToggle: {
    display: 'flex',
  },
});

export const SidePanelRecordCreationFormPage = () => {
  const recordCreationFormRequest = useAtomComponentStateValue(
    recordCreationFormRequestComponentState,
  );

  if (!isDefined(recordCreationFormRequest)) {
    return null;
  }

  return (
    <SidePanelRecordCreationForm
      requestId={recordCreationFormRequest.requestId}
      objectMetadataId={recordCreationFormRequest.objectMetadataId}
      initialDraftRecord={recordCreationFormRequest.initialDraftRecord}
    />
  );
};

const SidePanelRecordCreationForm = ({
  requestId,
  objectMetadataId,
  initialDraftRecord,
}: {
  requestId: string;
  objectMetadataId: string;
  initialDraftRecord: Partial<ObjectRecord>;
}) => {
  const { objectMetadataItem } = useObjectMetadataItemById({
    objectId: objectMetadataId,
  });

  const { objectMetadataItems } = useObjectMetadataItems();
  const theme = useTheme();

  const { settleRecordCreationDraft } = useRecordCreationFormSettle();
  const { enqueueToast } = useToast();

  const [recordCreationFormDraft, setRecordCreationFormDraft] =
    useAtomComponentState(recordCreationFormDraftComponentState);

  const [
    recordCreationFormAreHiddenFieldsShown,
    setRecordCreationFormAreHiddenFieldsShown,
  ] = useAtomComponentState(
    recordCreationFormAreHiddenFieldsShownComponentState,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const optionsDropdownId = useId();
  const currentFocusId = useAtomStateValue(currentFocusIdSelector);

  const draftRecord = recordCreationFormDraft ?? initialDraftRecord;

  const hasLayoutsPermission = useHasPermissionFlag(PermissionFlagType.LAYOUTS);

  const { openRecordCreationFormSettingsInSidePanel } =
    useOpenRecordCreationFormSettingsInSidePanel();

  const { recordFormFields } = useRecordFormFields({ objectMetadataItem });
  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const editableRecordFormFields = recordFormFields.filter(
    ({ fieldMetadataItem }) =>
      getFieldPermissions({
        objectPermissions,
        fieldMetadataId: fieldMetadataItem.id,
      }).canUpdateField,
  );

  const visibleFieldMetadataItems = editableRecordFormFields
    .filter((recordFormField) => recordFormField.isVisible)
    .map((recordFormField) => recordFormField.fieldMetadataItem);

  const hiddenFieldMetadataItems = editableRecordFormFields
    .filter((recordFormField) => !recordFormField.isVisible)
    .map((recordFormField) => recordFormField.fieldMetadataItem);

  const hiddenFieldsCount = hiddenFieldMetadataItems.length;

  const updateDraftRecord = (gqlFieldName: string, value: JsonValue) => {
    setRecordCreationFormDraft((previousDraftRecord) => ({
      ...(previousDraftRecord ?? initialDraftRecord),
      [gqlFieldName]: value,
    }));
  };

  const handleFieldValueChange = (gqlFieldName: string, value: JsonValue) => {
    updateDraftRecord(gqlFieldName, value);
  };

  const handleFieldValueClear = (gqlFieldName: string) => {
    updateDraftRecord(gqlFieldName, null);
  };

  const handleCreateClick = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await settleRecordCreationDraft({
        requestId,
        draftRecord: computeRecordFormCreateRecordInput({
          draftRecord,
          fieldMetadataItems: objectMetadataItem.fields,
          objectMetadataItems,
        }),
      });

      if (!isDefined(error)) {
        return;
      }

      enqueueToast(getToastOptionsFromError({ error }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerRef = useHotkeysOnFocusedElement({
    keys: [`${Key.Meta}+${Key.Enter}`, `${Key.Control}+${Key.Enter}`],
    focusId: currentFocusId ?? SIDE_PANEL_FOCUS_ID,
    callback: handleCreateClick,
    dependencies: [currentFocusId, handleCreateClick],
  });

  return (
    <div ref={containerRef} {...stylex.props(styles.container)}>
      <PageCardHeader
        title={
          <HeaderIdentifier
            icon={
              <ObjectMetadataIcon
                objectMetadataItem={objectMetadataItem}
                size={theme.icon.size.md}
                stroke={theme.icon.stroke.sm}
              />
            }
            title={t`Create ${objectMetadataItem.labelSingular}`}
          />
        }
      />
      <div {...stylex.props(styles.content)}>
        <RecordFormFieldInputs
          objectMetadataItem={objectMetadataItem}
          fieldMetadataItems={visibleFieldMetadataItems}
          draftRecord={draftRecord}
          onFieldValueChange={handleFieldValueChange}
          onFieldValueClear={handleFieldValueClear}
        />
        {hiddenFieldsCount > 0 && (
          <div {...stylex.props(styles.hiddenFieldsToggle)}>
            <LightButton
              startIcon={
                recordCreationFormAreHiddenFieldsShown ? (
                  <IconChevronUp />
                ) : (
                  <IconChevronDown />
                )
              }
              onClick={() =>
                setRecordCreationFormAreHiddenFieldsShown(
                  !recordCreationFormAreHiddenFieldsShown,
                )
              }
            >
              {recordCreationFormAreHiddenFieldsShown
                ? t`Collapse hidden fields`
                : t`Show hidden fields (${hiddenFieldsCount})`}
            </LightButton>
          </div>
        )}
        {recordCreationFormAreHiddenFieldsShown && hiddenFieldsCount > 0 && (
          <RecordFormFieldInputs
            objectMetadataItem={objectMetadataItem}
            fieldMetadataItems={hiddenFieldMetadataItems}
            draftRecord={draftRecord}
            onFieldValueChange={handleFieldValueChange}
            onFieldValueClear={handleFieldValueClear}
          />
        )}
      </div>
      <SidePanelFooter
        actions={[
          ...(hasLayoutsPermission
            ? [
                <SidePanelOptionsDropdown
                  key="options"
                  dropdownId={optionsDropdownId}
                >
                  <Dropdown.ActionItem
                    startIcon={<IconEdit />}
                    onClick={() =>
                      openRecordCreationFormSettingsInSidePanel(
                        objectMetadataItem,
                      )
                    }
                  >{t`Edit form`}</Dropdown.ActionItem>
                </SidePanelOptionsDropdown>,
              ]
            : []),
          <Button
            key="create-record"
            startIcon={<IconPlus />}
            size="sm"
            onClick={handleCreateClick}
            loading={isSubmitting}
            shortcut={['Mod', 'Enter']}
            data-testid="record-creation-form-create-button"
            variant="solid"
            color="accent"
          >{t`Create`}</Button>,
        ]}
      />
    </div>
  );
};
