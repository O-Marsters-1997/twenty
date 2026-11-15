import { Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';

import { SettingsMorphRelationMultiSelect } from '@/settings/components/SettingsMorphRelationMultiSelect';
import { FIELD_NAME_MAXIMUM_LENGTH } from '@/settings/data-model/constants/FieldNameMaximumLength';
import { RELATION_TYPES } from '@/settings/data-model/constants/RelationTypes';
import { useFieldMetadataItemDisableFieldEdition } from '@/settings/data-model/fields/forms/morph-relation/hooks/useFieldMetadataItemDisableFieldEdition';
import { useRelationSettingsFormDefaultValuesTargetFieldMetadata } from '@/settings/data-model/fields/forms/morph-relation/hooks/useRelationSettingsFormDefaultValuesTargetFieldMetadata';
import { useRelationSettingsFormInitialTargetObjectMetadatas } from '@/settings/data-model/fields/forms/morph-relation/hooks/useRelationSettingsFormInitialTargetObjectMetadatas';

import { useFieldMetadataItemById } from '@/object-metadata/hooks/useFieldMetadataItemById';

import { IconPicker } from '@/ui/input/components/IconPicker';
import { Select } from '@/ui/input/components/Select';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useIsMobile } from 'twenty-ui/utilities';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { RelationType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-1'],
  },
  inputsLabel: {
    color: fontColor['--t-font-color-light'],
    display: 'block',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBottom: spacing['--t-spacing-1'],
  },
  selectsContainer: {
    display: 'grid',
    gap: spacing['--t-spacing-4'],
    gridTemplateColumns: '1fr 1fr',
    marginBottom: spacing['--t-spacing-4'],
  },
  selectsContainerMobile: {
    gridTemplateColumns: '1fr',
  },
  inputsContainer: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    width: '100%',
  },
});

const RELATION_TYPE_OPTIONS = Object.entries(RELATION_TYPES).map(
  ([value, { label, Icon }]) => ({
    label,
    value: value as RelationType,
    Icon,
  }),
);

export const settingsDataModelFieldMorphRelationFormSchema = z.object({
  morphRelationObjectMetadataIds: z.array(z.uuid()).min(1),
  relationType: z.enum(
    Object.keys(RELATION_TYPES) as [RelationType, ...RelationType[]],
  ),
  targetFieldLabel: z.string().min(1),
  iconOnDestination: z.string().min(1),
  settings: z
    .object({
      junctionTargetFieldId: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export type SettingsDataModelFieldMorphRelationFormValues = z.infer<
  typeof settingsDataModelFieldMorphRelationFormSchema
>;

type SettingsDataModelFieldRelationFormProps = {
  sourceObjectMetadataId: string;
  existingFieldMetadataId: string;
  disabled?: boolean;
};

export const SettingsDataModelFieldRelationForm = ({
  existingFieldMetadataId,
  sourceObjectMetadataId,
  disabled = false,
}: SettingsDataModelFieldRelationFormProps) => {
  const { t } = useLingui();
  const { control, watch } = useFormContext();

  const currentIds = watch('morphRelationObjectMetadataIds') as
    | string[]
    | undefined;

  const isSelfInDestinationForMorphRelation =
    isDefined(currentIds) &&
    currentIds.length > 1 &&
    currentIds.includes(sourceObjectMetadataId);

  const { fieldMetadataItem: existingFieldMetadataItem } =
    useFieldMetadataItemById(existingFieldMetadataId);

  const disableRelationEdition = isDefined(existingFieldMetadataItem);
  const disableFieldEdition = useFieldMetadataItemDisableFieldEdition(
    existingFieldMetadataItem,
  );

  const initialRelationObjectMetadataItems =
    useRelationSettingsFormInitialTargetObjectMetadatas({
      fieldMetadataItem: existingFieldMetadataItem,
      sourceObjectMetadataId,
    });

  const initialRelationType =
    existingFieldMetadataItem?.relation?.type ?? RelationType.ONE_TO_MANY;

  const { label: defaultLabelOnDestination, icon: defaultIconOnDestination } =
    useRelationSettingsFormDefaultValuesTargetFieldMetadata({
      fieldMetadataItem: existingFieldMetadataItem,
      objectMetadataItem: initialRelationObjectMetadataItems[0],
      relationType: initialRelationType,
    });

  const initialMorphRelationsObjectMetadataIds =
    initialRelationObjectMetadataItems.map(
      (relationObjectMetadataItem) => relationObjectMetadataItem.id,
    );
  const isMobile = useIsMobile();

  return (
    <div {...stylex.props(styles.container)}>
      <div
        {...stylex.props(
          styles.selectsContainer,
          isMobile && styles.selectsContainerMobile,
        )}
      >
        <Controller
          name="relationType"
          control={control}
          defaultValue={initialRelationType}
          render={({ field: { onChange, value } }) => (
            <Select
              label={t`Relation type`}
              dropdownId="relation-type-select"
              fullWidth
              disabled={disabled || disableRelationEdition}
              value={value}
              options={RELATION_TYPE_OPTIONS}
              onChange={onChange}
            />
          )}
        />

        <Controller
          name="morphRelationObjectMetadataIds"
          control={control}
          defaultValue={initialMorphRelationsObjectMetadataIds}
          render={({ field: { onChange, value } }) => (
            <SettingsMorphRelationMultiSelect
              label={t`Object destination`}
              dropdownId="object-destination-select"
              fullWidth
              disabled={disableRelationEdition}
              selectedObjectMetadataIds={value}
              withSearchInput={true}
              onChange={onChange}
              error={
                isSelfInDestinationForMorphRelation
                  ? t`Relations cannot include the source object when multiple destinations are selected.`
                  : undefined
              }
            />
          )}
        />
      </div>
      <span
        {...stylex.props(styles.inputsLabel)}
      >{t`Field on destination`}</span>
      <div {...stylex.props(styles.inputsContainer)}>
        <Controller
          name="iconOnDestination"
          control={control}
          defaultValue={defaultIconOnDestination}
          render={({ field: { onChange, value } }) => (
            <IconPicker
              disabled={disableFieldEdition}
              dropdownId="field-destination-icon-picker"
              selectedIconKey={value ?? undefined}
              onChange={({ iconKey }) => onChange(iconKey)}
              variant="outline"
            />
          )}
        />
        <Controller
          name="targetFieldLabel"
          control={control}
          defaultValue={defaultLabelOnDestination}
          render={({ field: { onChange, value } }) => (
            <SettingsTextInput
              instanceId="relation-field-label"
              disabled={disableFieldEdition}
              placeholder={t`Field name`}
              value={value}
              onChange={onChange}
              fullWidth
              maxLength={FIELD_NAME_MAXIMUM_LENGTH}
            />
          )}
        />
      </div>
    </div>
  );
};
