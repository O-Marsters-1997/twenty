import { useLabelIdentifierFieldMetadataItem } from '@/object-metadata/hooks/useLabelIdentifierFieldMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { BooleanFieldInput } from '@/object-record/record-field/ui/meta-types/input/components/BooleanFieldInput';
import { RatingFieldInput } from '@/object-record/record-field/ui/meta-types/input/components/RatingFieldInput';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { SettingsDataModelLabelIdentifierPreviewContextWrapper } from '@/settings/data-model/fields/preview/components/SettingsDataModelLabelIdentifierPreviewContextWrapper';
import { SettingsDataModelSetFieldValueEffect } from '@/settings/data-model/fields/preview/components/SettingsDataModelSetFieldValueEffect';
import { SettingsDataModelSetLabelIdentifierRecordEffect } from '@/settings/data-model/fields/preview/components/SettingsDataModelSetLabelIdentifierRecordEffect';
import { useFieldPreviewValue } from '@/settings/data-model/fields/preview/hooks/useFieldPreviewValue';
import { useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { FieldMetadataType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsDataModelFieldPreviewProps = {
  fieldMetadataItem: Pick<
    FieldMetadataItem,
    'name' | 'icon' | 'label' | 'type' | 'defaultValue' | 'options' | 'settings'
  >;
  objectNameSingular: string;
  shrink?: boolean;
  withFieldLabel?: boolean;
};

const styles = stylex.create({
  fieldPreview: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    height: 'fit-content',
    lineHeight: '24px',
    marginTop: spacing['--t-spacing-2'],
    overflow: 'hidden',
    paddingBottom: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    whiteSpace: 'nowrap',
  },
  fieldPreviewShrink: {
    paddingInline: spacing['--t-spacing-1'],
  },
  fieldLabel: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
});

export const SettingsDataModelFieldPreview = ({
  fieldMetadataItem,
  objectNameSingular,
  shrink,
  withFieldLabel = true,
}: SettingsDataModelFieldPreviewProps) => {
  const { labelIdentifierFieldMetadataItem } =
    useLabelIdentifierFieldMetadataItem({
      objectNameSingular: objectNameSingular,
    });

  const theme = useTheme();
  const { getIcon } = useIcons();
  const FieldIcon = getIcon(fieldMetadataItem.icon);

  const isLabelIdentifier =
    labelIdentifierFieldMetadataItem?.name === fieldMetadataItem.name;

  const fieldName = fieldMetadataItem.name;
  const fieldType = fieldMetadataItem.type;

  const recordId = `${objectNameSingular}-${fieldName}-${fieldType}-preview`;

  const fieldPreviewValue = useFieldPreviewValue({
    fieldMetadataItem,
    skip: isLabelIdentifier,
  });

  const metadata = {
    fieldName,
    objectMetadataNameSingular: objectNameSingular,
    options: fieldMetadataItem.options ?? [],
    settings: fieldMetadataItem.settings,
  };

  return (
    <>
      <SettingsDataModelLabelIdentifierPreviewContextWrapper
        objectNameSingular={objectNameSingular}
        labelIdentifierFieldMetadataItem={labelIdentifierFieldMetadataItem}
      >
        <RecordFieldComponentInstanceContext.Provider
          value={{
            instanceId: 'record-field-component-instance-id',
          }}
        >
          {isLabelIdentifier ? (
            <SettingsDataModelSetLabelIdentifierRecordEffect
              objectNameSingular={objectNameSingular}
              recordId={recordId}
            />
          ) : (
            <SettingsDataModelSetFieldValueEffect
              recordId={recordId}
              gqlFieldName={fieldMetadataItem.name ?? ''}
              value={fieldPreviewValue}
            />
          )}
          <div
            {...stylex.props(
              styles.fieldPreview,
              shrink && styles.fieldPreviewShrink,
            )}
          >
            {!!withFieldLabel && (
              <div {...stylex.props(styles.fieldLabel)}>
                <FieldIcon
                  size={theme.icon.size.md}
                  stroke={theme.icon.stroke.sm}
                />
                {fieldMetadataItem.label}:
              </div>
            )}
            <FieldContext.Provider
              value={{
                recordId,
                isLabelIdentifier,
                fieldDefinition: {
                  type: fieldMetadataItem.type,
                  iconName: 'FieldIcon',
                  fieldMetadataId: '',
                  label: fieldMetadataItem.label,
                  metadata,
                  defaultValue: fieldMetadataItem.defaultValue,
                },
                isRecordFieldReadOnly:
                  fieldMetadataItem.type === FieldMetadataType.BOOLEAN ||
                  fieldMetadataItem.type === FieldMetadataType.RATING
                    ? true
                    : false,
                disableChipClick: true,
              }}
            >
              {fieldMetadataItem.type === FieldMetadataType.BOOLEAN ? (
                <BooleanFieldInput />
              ) : fieldMetadataItem.type === FieldMetadataType.RATING ? (
                <RatingFieldInput />
              ) : (
                <FieldDisplay />
              )}
            </FieldContext.Provider>
          </div>
        </RecordFieldComponentInstanceContext.Provider>
      </SettingsDataModelLabelIdentifierPreviewContextWrapper>
    </>
  );
};
