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
import { useValidationRules } from '@/validation-rules/hooks/useValidationRules';
import { type ValidationRuleViolation } from '@/validation-rules/types/ValidationRuleViolation';
import { buildValidationRuleFieldDescriptors } from '@/validation-rules/utils/buildValidationRuleFieldDescriptors';
import { computeDraftValidationRuleViolations } from '@/validation-rules/utils/computeDraftValidationRuleViolations';
import { getValidationRuleViolationsFromError } from '@/validation-rules/utils/getValidationRuleViolationsFromError';
import { groupValidationRuleViolationsByField } from '@/validation-rules/utils/groupValidationRuleViolationsByField';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useId, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Key } from 'ts-key-enum';
import { type JsonValue } from 'type-fest';
import { PermissionFlagType } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';
import { InlineBanner, useToast } from 'twenty-ui/components/feedback';
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
  validationRuleErrors: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
    flexShrink: '0',
    maxHeight: '30%',
    overflowY: 'auto',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-2'],
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
  const [draftValidationRuleViolations, setDraftValidationRuleViolations] =
    useState<ValidationRuleViolation[]>([]);
  const [serverValidationRuleViolations, setServerValidationRuleViolations] =
    useState<ValidationRuleViolation[]>([]);

  const { validationRules } = useValidationRules({ objectMetadataId });
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

  const { violationsByFieldMetadataId, recordViolations } =
    groupValidationRuleViolationsByField({
      violations: [
        ...draftValidationRuleViolations,
        ...serverValidationRuleViolations,
      ],
      displayedFieldMetadataIds: [
        ...visibleFieldMetadataItems,
        ...(recordCreationFormAreHiddenFieldsShown
          ? hiddenFieldMetadataItems
          : []),
      ].map((fieldMetadataItem) => fieldMetadataItem.id),
    });

  const computeViolations = (draftRecordToCheck: Partial<ObjectRecord>) =>
    computeDraftValidationRuleViolations({
      validationRules,
      draftRecord: draftRecordToCheck,
      fields: buildValidationRuleFieldDescriptors({
        objectMetadataItem,
        objectMetadataItems,
      }),
      fieldMetadataItems: objectMetadataItem.fields,
      now: new Date().toISOString(),
    });

  const updateDraftRecord = (gqlFieldName: string, value: JsonValue) => {
    setRecordCreationFormDraft((previousDraftRecord) => ({
      ...(previousDraftRecord ?? initialDraftRecord),
      [gqlFieldName]: value,
    }));

    if (draftValidationRuleViolations.length > 0) {
      setDraftValidationRuleViolations(
        computeViolations({ ...draftRecord, [gqlFieldName]: value }),
      );
    }
  };

  const handleFieldValueChange = (gqlFieldName: string, value: JsonValue) => {
    updateDraftRecord(gqlFieldName, value);
  };

  const handleFieldValueClear = (gqlFieldName: string) => {
    updateDraftRecord(gqlFieldName, null);
  };

  const revealHiddenFieldsIfTargeted = (
    targetedFieldMetadataIds: (string | null)[],
  ) => {
    const isAnyHiddenFieldTargeted = hiddenFieldMetadataItems.some(
      (fieldMetadataItem) =>
        targetedFieldMetadataIds.includes(fieldMetadataItem.id),
    );

    if (isAnyHiddenFieldTargeted) {
      setRecordCreationFormAreHiddenFieldsShown(true);
    }
  };

  const handleCreateClick = async () => {
    if (isSubmitting) {
      return;
    }

    setServerValidationRuleViolations([]);

    if (validationRules.length > 0) {
      const draftViolations = computeViolations(draftRecord);

      setDraftValidationRuleViolations(draftViolations);

      revealHiddenFieldsIfTargeted(
        draftViolations.map((violation) => violation.fieldMetadataId),
      );

      if (draftViolations.length > 0) {
        return;
      }
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

      const serverViolations = getValidationRuleViolationsFromError(error);

      setServerValidationRuleViolations(serverViolations);

      if (serverViolations.length === 0) {
        enqueueToast(getToastOptionsFromError({ error }));
        return;
      }

      revealHiddenFieldsIfTargeted(
        serverViolations.map((violation) => violation.fieldMetadataId),
      );
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
          validationRuleViolationsByFieldMetadataId={
            violationsByFieldMetadataId
          }
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
            validationRuleViolationsByFieldMetadataId={
              violationsByFieldMetadataId
            }
            onFieldValueChange={handleFieldValueChange}
            onFieldValueClear={handleFieldValueClear}
          />
        )}
      </div>
      {recordViolations.length > 0 && (
        <div {...stylex.props(styles.validationRuleErrors)}>
          {recordViolations.map((violation) => (
            <InlineBanner key={violation.ruleId} status="error" role="alert">
              {violation.message}
            </InlineBanner>
          ))}
        </div>
      )}
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
