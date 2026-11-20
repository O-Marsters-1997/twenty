/* @license Enterprise */

import { t } from '@lingui/core/macro';
import { useContext, useMemo } from 'react';
import { FieldMetadataType, CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconEraser } from 'twenty-ui/icon';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { type JsonValue } from 'type-fest';

import { useFieldMetadataItemById } from '@/object-metadata/hooks/useFieldMetadataItemById';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { formatFieldMetadataItemAsFieldDefinition } from '@/object-metadata/utils/formatFieldMetadataItemAsFieldDefinition';
import { AdvancedFilterContext } from '@/object-record/advanced-filter/states/context/AdvancedFilterContext';
import { useApplyObjectFilterDropdownFilterValue } from '@/object-record/object-filter-dropdown/hooks/useApplyObjectFilterDropdownFilterValue';
import { useUpsertObjectFilterDropdownCurrentFilter } from '@/object-record/object-filter-dropdown/hooks/useUpsertObjectFilterDropdownCurrentFilter';
import { configurableViewFilterOperands } from '@/object-record/object-filter-dropdown/utils/configurableViewFilterOperands';
import { getCompositeSubFieldLabel } from '@/object-record/object-filter-dropdown/utils/getCompositeSubFieldLabel';
import { getCompositeSubFieldType } from '@/object-record/object-filter-dropdown/utils/getCompositeSubFieldType';
import { isCompositeFieldType } from '@/object-record/object-filter-dropdown/utils/isCompositeFieldType';
import { FormFieldInput } from '@/object-record/record-field/ui/components/FormFieldInput';
import { FormMultiSelectFieldInput } from '@/object-record/record-field/ui/form-types/components/FormMultiSelectFieldInput';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { type RLSDynamicValue } from '@/object-record/record-filter/types/RecordFilter';
import { isValidSubFieldName } from '@/settings/data-model/utils/isValidSubFieldName';
import { SettingsRolePermissionsObjectLevelRecordLevelPermissionVariablePicker } from '@/settings/roles/role-permissions/object-level-permissions/record-level-permissions/components/SettingsRolePermissionsObjectLevelRecordLevelPermissionVariablePicker';
import { RecordLevelPermissionVariablePickerContext } from '@/settings/roles/role-permissions/object-level-permissions/record-level-permissions/contexts/RecordLevelPermissionVariablePickerContext';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    flex: '3',
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    maxWidth: '100%',
    minWidth: '0',
  },
  iconContainer: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderLeftStyle: 'none',
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  readOnlyInput: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    flex: '1',
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    height: '32px',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  meText: {
    color: color['--t-color-blue'],
    flexShrink: '0',
  },
  fieldLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: '0',
  },
  formFieldInputWrapper: {
    flex: '1',
    overflow: 'visible',
    display: 'flex',
    minWidth: '0',
  },
});

type SettingsRolePermissionsObjectLevelRecordLevelPermissionValueInputProps = {
  recordFilterId: string;
};

export const SettingsRolePermissionsObjectLevelRecordLevelPermissionValueInput =
  ({
    recordFilterId,
  }: SettingsRolePermissionsObjectLevelRecordLevelPermissionValueInputProps) => {
    const theme = useTheme();
    const { objectMetadataItem } = useContext(AdvancedFilterContext);

    const currentRecordFilters = useAtomComponentStateValue(
      currentRecordFiltersComponentState,
    );

    const recordFilter = currentRecordFilters.find(
      (filter) => filter.id === recordFilterId,
    );

    const { fieldMetadataItem } = useFieldMetadataItemById(
      recordFilter?.fieldMetadataId ?? '',
    );

    const { objectMetadataItem: workspaceMemberMetadataItem } =
      useObjectMetadataItem({
        objectNameSingular: CoreObjectNameSingular.WorkspaceMember,
      });

    const { upsertObjectFilterDropdownCurrentFilter } =
      useUpsertObjectFilterDropdownCurrentFilter();

    const { applyObjectFilterDropdownFilterValue } =
      useApplyObjectFilterDropdownFilterValue();

    const dynamicValue = recordFilter?.rlsDynamicValue;
    const isDynamicMode = isDefined(dynamicValue);

    const operandHasNoInput =
      isDefined(recordFilter) &&
      !configurableViewFilterOperands.has(recordFilter.operand);

    const workspaceMemberFieldLabel = useMemo(() => {
      if (!dynamicValue) {
        return null;
      }

      const workspaceMemberField = workspaceMemberMetadataItem?.fields.find(
        (field) => field.id === dynamicValue.workspaceMemberFieldMetadataId,
      );

      if (isDefined(workspaceMemberField)) {
        if (workspaceMemberField.name === 'id') {
          return null;
        }

        const baseLabel = workspaceMemberField.label;

        if (
          isDefined(dynamicValue.workspaceMemberSubFieldName) &&
          isValidSubFieldName(dynamicValue.workspaceMemberSubFieldName) &&
          isCompositeFieldType(workspaceMemberField.type)
        ) {
          const subFieldLabel = getCompositeSubFieldLabel(
            workspaceMemberField.type,
            dynamicValue.workspaceMemberSubFieldName,
          );

          return subFieldLabel ? `${baseLabel} / ${subFieldLabel}` : baseLabel;
        }

        return baseLabel;
      }

      return (
        dynamicValue.workspaceMemberSubFieldName ??
        dynamicValue.workspaceMemberFieldMetadataId
      );
    }, [dynamicValue, workspaceMemberMetadataItem?.fields]);

    const handleSelectDynamicValue = ({
      workspaceMemberFieldMetadataId,
      workspaceMemberSubFieldName,
    }: RLSDynamicValue) => {
      if (!recordFilter) {
        return;
      }

      const updatedFilter = {
        ...recordFilter,
        value: '',
        rlsDynamicValue: {
          workspaceMemberFieldMetadataId,
          workspaceMemberSubFieldName: workspaceMemberSubFieldName ?? null,
        },
      };

      upsertObjectFilterDropdownCurrentFilter(updatedFilter);
    };

    const handleResetToStaticValue = () => {
      if (!recordFilter) {
        return;
      }

      const updatedFilter = {
        ...recordFilter,
        rlsDynamicValue: null,
      };

      upsertObjectFilterDropdownCurrentFilter(updatedFilter);
    };

    if (isDynamicMode) {
      const tooltipId = `record-level-permission-value-${recordFilterId}`;
      const fullLabel = isDefined(workspaceMemberFieldLabel)
        ? `Me / ${workspaceMemberFieldLabel}`
        : 'Me';

      return (
        <div {...stylex.props(styles.container)}>
          <Tooltip
            content={fullLabel}
            delay={TooltipDelay.shortDelay}
            side="bottom"
            positionMethod="fixed"
          >
            <div id={tooltipId} {...stylex.props(styles.readOnlyInput)}>
              <span {...stylex.props(styles.meText)}>{t`Me`}</span>
              {isDefined(workspaceMemberFieldLabel) && (
                <span
                  {...stylex.props(styles.fieldLabel)}
                >{` / ${workspaceMemberFieldLabel}`}</span>
              )}
            </div>
          </Tooltip>
          <div
            onClick={handleResetToStaticValue}
            aria-label={t`Reset to static value`}
            {...stylex.props(styles.iconContainer)}
          >
            <IconEraser size={theme.icon.size.sm} />
          </div>
        </div>
      );
    }

    if (!isDefined(recordFilter) || !isDefined(fieldMetadataItem)) {
      return null;
    }

    if (operandHasNoInput) {
      return <div {...stylex.props(styles.container)} />;
    }

    const handleChange = (value: JsonValue) => {
      const valueToUpsert =
        typeof value === 'string'
          ? value
          : Array.isArray(value) ||
              (typeof value === 'object' && value !== null)
            ? JSON.stringify(value)
            : String(value);

      applyObjectFilterDropdownFilterValue(valueToUpsert);
    };

    let fieldDefinition = formatFieldMetadataItemAsFieldDefinition({
      field: {
        ...fieldMetadataItem,
        label: undefined as unknown as string,
      },
      objectMetadataItem: objectMetadataItem,
    });

    const isComposite = isCompositeFieldType(recordFilter.type);

    if (isComposite && isDefined(recordFilter.subFieldName)) {
      const subFieldType = getCompositeSubFieldType(
        fieldMetadataItem,
        recordFilter.subFieldName,
      );

      if (isDefined(subFieldType)) {
        fieldDefinition = {
          ...fieldDefinition,
          type: subFieldType,
        };
      }
    }

    const isFilterableByMultiSelectValue =
      fieldDefinition.type === FieldMetadataType.MULTI_SELECT ||
      fieldDefinition.type === FieldMetadataType.SELECT;

    if (isFilterableByMultiSelectValue) {
      let formattedValue = recordFilter.value;

      if (isDefined(formattedValue) && formattedValue !== '') {
        try {
          const parsed = JSON.parse(formattedValue);
          if (!Array.isArray(parsed)) {
            formattedValue = JSON.stringify([formattedValue]);
          }
        } catch {
          formattedValue = JSON.stringify([formattedValue]);
        }
      }

      return (
        <div {...stylex.props(styles.container)}>
          <RecordLevelPermissionVariablePickerContext.Provider
            value={{ recordFilterId, onSelect: handleSelectDynamicValue }}
          >
            <div {...stylex.props(styles.formFieldInputWrapper)}>
              <FormMultiSelectFieldInput
                label=""
                defaultValue={formattedValue}
                onChange={handleChange}
                options={fieldMetadataItem?.options ?? []}
                VariablePicker={
                  SettingsRolePermissionsObjectLevelRecordLevelPermissionVariablePicker
                }
                dropdownWidth={200}
              />
            </div>
          </RecordLevelPermissionVariablePickerContext.Provider>
        </div>
      );
    }

    return (
      <div {...stylex.props(styles.container)}>
        <RecordLevelPermissionVariablePickerContext.Provider
          value={{ recordFilterId, onSelect: handleSelectDynamicValue }}
        >
          <div {...stylex.props(styles.formFieldInputWrapper)}>
            <FormFieldInput
              field={fieldDefinition}
              defaultValue={recordFilter.value}
              onChange={handleChange}
              VariablePicker={
                SettingsRolePermissionsObjectLevelRecordLevelPermissionVariablePicker
              }
            />
          </div>
        </RecordLevelPermissionVariablePickerContext.Provider>
      </div>
    );
  };
