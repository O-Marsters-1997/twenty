import { Controller, useFormContext } from 'react-hook-form';
import { type z } from 'zod';

import { useGetIsMetadataItemCustom } from '@/object-metadata/hooks/useGetIsMetadataItemCustom';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { fieldMetadataItemSchema } from '@/object-metadata/validation-schemas/fieldMetadataItemSchema';
import { AdvancedSettingsContentWrapperWithDot } from '@/settings/components/AdvancedSettingsContentWrapperWithDot';
import { AdvancedSettingsWrapper } from '@/settings/components/AdvancedSettingsWrapper';
import { SettingsOptionCardContentSwitch } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSwitch';
import { IDENTIFIER_MAX_CHAR_LENGTH } from 'twenty-shared/metadata';
import { getErrorMessageFromError } from '@/object-metadata/utils/metadataLabelErrorMessages';
import { IconPicker } from '@/ui/input/components/IconPicker';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useLingui } from '@lingui/react/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconInfoCircle, IconRefresh } from 'twenty-ui/icon';
import { Card, Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';
import { computeMetadataNameFromLabel } from '@/object-metadata/utils/computeMetadataNameFromLabel';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

export const settingsDataModelFieldIconLabelFormSchema = (
  existingOtherLabels: string[] = [],
) => {
  return fieldMetadataItemSchema(existingOtherLabels)
    .pick({
      icon: true,
      label: true,
    })
    .merge(
      fieldMetadataItemSchema()
        .pick({
          name: true,
          isLabelSyncedWithName: true,
        })
        .partial(),
    );
};

type SettingsDataModelFieldIconLabelFormValues = z.infer<
  ReturnType<typeof settingsDataModelFieldIconLabelFormSchema>
>;

const styles = stylex.create({
  inputsContainer: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    marginBottom: spacing['--t-spacing-1'],
    width: '100%',
  },
  advancedSettingsSectionInputWrapper: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    width: '100%',
  },
  advancedSettingsOuterContainer: {
    paddingTop: spacing['--t-spacing-4'],
  },
  advancedSettingsContainer: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    position: 'relative',
    width: '100%',
  },
});

type SettingsDataModelFieldIconLabelFormProps = {
  fieldMetadataItem?: FieldMetadataItem;
  maxLength?: number;
  isCreationMode?: boolean;
  readonly?: boolean;
};

export const SettingsDataModelFieldIconLabelForm = ({
  isCreationMode = false,
  fieldMetadataItem,
  maxLength,
  readonly = false,
}: SettingsDataModelFieldIconLabelFormProps) => {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
    trigger,
  } = useFormContext<SettingsDataModelFieldIconLabelFormValues>();

  const theme = useTheme();
  const label = watch('label');

  const { t } = useLingui();

  const getIsMetadataItemCustom = useGetIsMetadataItemCustom();

  const isCustomField =
    isDefined(fieldMetadataItem) && getIsMetadataItemCustom(fieldMetadataItem);

  const labelTextInputId = `${fieldMetadataItem?.id}-label`;
  const nameTextInputId = `${fieldMetadataItem?.id}-name`;

  const isLabelSyncedWithName =
    watch('isLabelSyncedWithName') ??
    (isDefined(fieldMetadataItem)
      ? fieldMetadataItem.isLabelSyncedWithName
      : true);

  const apiNameTooltipText = isLabelSyncedWithName
    ? t`Deactivate "Synchronize Objects Labels and API Names" to set a custom API name`
    : t`Input must be in camel case and cannot start with a number`;

  const fillNameFromLabel = (label: string) => {
    isDefined(label) &&
      setValue('name', computeMetadataNameFromLabel(label), {
        shouldDirty: true,
      });
  };

  const isRelation =
    fieldMetadataItem?.type === FieldMetadataType.RELATION ||
    fieldMetadataItem?.type === FieldMetadataType.MORPH_RELATION;

  const isCustomButNotRelationField = isCustomField && !isRelation;

  const canToggleSyncLabelWithName =
    !isCreationMode && isCustomButNotRelationField;

  const isNameEditEnabled =
    isLabelSyncedWithName === false && isCustomButNotRelationField;

  const isLabelEditEnabled =
    isCreationMode ||
    (!isCreationMode &&
      ((isDefined(fieldMetadataItem) && !isCustomField) ||
        isCustomButNotRelationField));

  return (
    <>
      <div {...stylex.props(styles.inputsContainer)}>
        <Controller
          name="icon"
          control={control}
          defaultValue={fieldMetadataItem?.icon ?? 'IconUsers'}
          render={({ field: { onChange, value } }) => (
            <IconPicker
              selectedIconKey={value ?? 'IconUsers'}
              onChange={({ iconKey }) => onChange(iconKey)}
              variant="outline"
              disabled={readonly}
            />
          )}
        />
        <Controller
          name="label"
          control={control}
          defaultValue={fieldMetadataItem?.label}
          render={({ field: { onChange, value } }) => (
            <SettingsTextInput
              instanceId={labelTextInputId}
              placeholder={t`Employees`}
              value={value}
              disabled={!isLabelEditEnabled || readonly}
              onChange={(value) => {
                onChange(value);
                trigger('label');
                if (
                  isCreationMode ||
                  (isLabelSyncedWithName === true && isCustomField)
                ) {
                  fillNameFromLabel(value);
                }
              }}
              error={getErrorMessageFromError(errors.label?.message)}
              maxLength={maxLength}
              fullWidth
            />
          )}
        />
      </div>
      {canToggleSyncLabelWithName && (
        <AdvancedSettingsWrapper hideDot>
          <div {...stylex.props(styles.advancedSettingsOuterContainer)}>
            <div {...stylex.props(styles.advancedSettingsContainer)}>
              <div
                {...stylex.props(styles.advancedSettingsSectionInputWrapper)}
              >
                <div {...stylex.props(styles.inputsContainer)}>
                  <Controller
                    name="name"
                    control={control}
                    defaultValue={fieldMetadataItem?.name}
                    render={({ field: { onChange, value } }) => (
                      <SettingsTextInput
                        instanceId={nameTextInputId}
                        label={t`API Name`}
                        placeholder={t`employees`}
                        value={value}
                        onChange={onChange}
                        readOnly={readonly}
                        disabled={!isNameEditEnabled}
                        fullWidth
                        maxLength={IDENTIFIER_MAX_CHAR_LENGTH}
                        RightIcon={() =>
                          apiNameTooltipText && (
                            <>
                              <Tooltip
                                content={apiNameTooltipText}
                                sideOffset={5}
                                side="bottom"
                                positionMethod="fixed"
                                delay={TooltipDelay.shortDelay}
                              >
                                <IconInfoCircle
                                  id="info-circle-id-name"
                                  size={theme.icon.size.md}
                                  color={theme.font.color.tertiary}
                                  style={{ outline: 'none' }}
                                />
                              </Tooltip>
                            </>
                          )
                        }
                      />
                    )}
                  />
                </div>
                <Controller
                  name="isLabelSyncedWithName"
                  control={control}
                  defaultValue={
                    fieldMetadataItem?.isLabelSyncedWithName ?? true
                  }
                  render={({ field: { onChange, value } }) => (
                    <AdvancedSettingsContentWrapperWithDot
                      hideDot={false}
                      dotPosition="centered"
                    >
                      <Card.Root rounded>
                        <SettingsOptionCardContentSwitch
                          Icon={IconRefresh}
                          title={t`Synchronize Field Label and API Name`}
                          description={t`Should changing a field's label also change the API name?`}
                          checked={value ?? true}
                          disabled={readonly}
                          advancedMode
                          onChange={(value) => {
                            onChange(value);
                            if (!isDefined(fieldMetadataItem)) {
                              return;
                            }

                            if (value === false) {
                              return;
                            }

                            if (isCustomField && !isRelation) {
                              fillNameFromLabel(label);
                              return;
                            }
                          }}
                        />
                      </Card.Root>
                    </AdvancedSettingsContentWrapperWithDot>
                  )}
                />
              </div>
            </div>
          </div>
        </AdvancedSettingsWrapper>
      )}
    </>
  );
};
