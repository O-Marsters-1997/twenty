import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type FieldMetadataItemRelation } from '@/object-metadata/types/FieldMetadataItemRelation';
import { FieldDisplay } from '@/object-record/record-field/ui/components/FieldDisplay';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { SettingsDataModelSetFieldValueEffect } from '@/settings/data-model/fields/preview/components/SettingsDataModelSetFieldValueEffect';
import { useFieldPreviewValue } from '@/settings/data-model/fields/preview/hooks/useFieldPreviewValue';
import { useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { v4 } from 'uuid';
import { FieldMetadataType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsDataModelRelationFieldPreviewProps = {
  fieldMetadataItem: Pick<
    FieldMetadataItem,
    'icon' | 'label' | 'type' | 'settings'
  >;
  relationTargetObjectNameSingular: string;
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

export const SettingsDataModelRelationFieldPreview = ({
  fieldMetadataItem,
  relationTargetObjectNameSingular,
  shrink,
  withFieldLabel = true,
}: SettingsDataModelRelationFieldPreviewProps) => {
  const { objectMetadataItem: relationTargetObjectMetadataItem } =
    useObjectMetadataItem({
      objectNameSingular: relationTargetObjectNameSingular,
    });
  const theme = useTheme();
  const { getIcon } = useIcons();
  const FieldIcon = getIcon(fieldMetadataItem.icon);

  const fieldPreviewValue = useFieldPreviewValue({
    fieldMetadataItem,
    relationObjectNameSingular: relationTargetObjectNameSingular,
  });

  const fieldName = v4();

  const recordId = `${relationTargetObjectNameSingular}-${fieldName}-RELATION-preview`;

  const isRelation = fieldMetadataItem.type === FieldMetadataType.RELATION;
  const metadata = {
    fieldName,
    objectMetadataNameSingular: CoreObjectNameSingular.Company,
    relationObjectMetadataNameSingular: relationTargetObjectNameSingular,
    options: [],
    settings: fieldMetadataItem.settings,
    relationType: fieldMetadataItem.settings?.relationType,
    morphRelations:
      fieldMetadataItem.type === FieldMetadataType.MORPH_RELATION
        ? [
            {
              type: fieldMetadataItem.settings?.relationType,
              sourceFieldMetadata: {
                id: v4(),
                name: fieldName,
              },
              targetFieldMetadata: {
                id: v4(),
                name: 'does-not-matter',
              },
              sourceObjectMetadata: {
                id: v4(),
                namePlural: 'does-not-matter',
                nameSingular: 'does-not-matter',
              },
              targetObjectMetadata: {
                id: v4(),
                namePlural: relationTargetObjectMetadataItem.namePlural,
                nameSingular: relationTargetObjectMetadataItem.nameSingular,
              },
            } satisfies FieldMetadataItemRelation,
          ]
        : [],
    relationFieldMetadataId: isRelation ? '' : v4(),
    relationObjectMetadataId: isRelation ? '' : v4(),
    relationObjectMetadataNamePlural: isRelation
      ? ''
      : relationTargetObjectMetadataItem.namePlural,
  };

  return (
    <>
      <RecordFieldComponentInstanceContext.Provider
        value={{
          instanceId: 'record-field-component-instance-id',
        }}
      >
        <SettingsDataModelSetFieldValueEffect
          recordId={recordId}
          gqlFieldName={fieldName}
          value={fieldPreviewValue}
        />
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
              isLabelIdentifier: false,
              fieldDefinition: {
                type: fieldMetadataItem.type,
                iconName: 'FieldIcon',
                fieldMetadataId: '',
                label: fieldMetadataItem.label,
                metadata,
                defaultValue: null,
              },
              isRecordFieldReadOnly: true,
              disableChipClick: true,
            }}
          >
            <FieldDisplay />
          </FieldContext.Provider>
        </div>
      </RecordFieldComponentInstanceContext.Provider>
    </>
  );
};
