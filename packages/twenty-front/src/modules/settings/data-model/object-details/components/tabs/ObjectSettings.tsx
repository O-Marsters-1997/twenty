import { isDDLLockedState } from '@/client-config/states/isDDLLockedState';
import { useDeleteOneObjectMetadataItem } from '@/object-metadata/hooks/useDeleteOneObjectMetadataItem';
import { useGetIsMetadataItemCustom } from '@/object-metadata/hooks/useGetIsMetadataItemCustom';
import { useUpdateOneObjectMetadataItem } from '@/object-metadata/hooks/useUpdateOneObjectMetadataItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getObjectColorWithFallback } from '@/object-metadata/utils/getObjectColorWithFallback';
import { isShareableObjectMetadataItem } from '@/object-record/record-sharing/utils/isShareableObjectMetadataItem';
import { isObjectMetadataReadOnly } from '@/object-record/read-only/utils/isObjectMetadataReadOnly';
import { AdvancedSettingsWrapper } from '@/settings/components/AdvancedSettingsWrapper';
import { SettingsUpdateDataModelObjectAboutForm } from '@/settings/data-model/object-details/components/SettingsUpdateDataModelObjectAboutForm';
import { SettingsObjectIndexesSection } from '@/settings/data-model/object-details/components/tabs/SettingsObjectIndexesSection';
import { ObjectSharingReachPicker } from '@/settings/data-model/object-details/components/tabs/ObjectSharingReachPicker';
import { SettingsObjectSearchSection } from '@/settings/data-model/object-details/components/tabs/SettingsObjectSearchSection';
import { SettingsObjectValidationRulesSection } from '@/settings/data-model/object-details/components/tabs/SettingsObjectValidationRulesSection';
import { SettingsDataModelObjectSettingsFormCard } from '@/settings/data-model/objects/forms/components/SettingsDataModelObjectSettingsFormCard';
import {
  type SettingsDataModelObjectAboutFormValues,
  settingsDataModelObjectAboutFormSchema,
} from '@/settings/data-model/validation-schemas/settingsDataModelObjectAboutFormSchema';
import { SettingsTranslationsCard } from '@/settings/translations/components/SettingsTranslationsCard';
import { ConfirmationDialog } from '@/ui/layout/dialog/components/ConfirmationDialog';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLingui } from '@lingui/react/macro';
import { useForm } from 'react-hook-form';
import { SettingsPath } from 'twenty-shared/types';
import { isEmptyObject } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { Section } from 'twenty-ui/components/layout';
import { IconArchive, IconTrash } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { FeatureFlagKey } from '~/generated-metadata/graphql';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type ObjectSettingsProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  isDeleting: boolean;
  setIsDeleting: (isDeleting: boolean) => void;
};

const DELETE_OBJECT_MODAL_ID = 'delete-object-confirmation-modal';

export const ObjectSettings = ({
  objectMetadataItem,
  isDeleting,
  setIsDeleting,
}: ObjectSettingsProps) => {
  const { t } = useLingui();
  const navigate = useNavigateSettings();
  const getIsMetadataItemCustom = useGetIsMetadataItemCustom();
  const { updateOneObjectMetadataItem } = useUpdateOneObjectMetadataItem();
  const { deleteOneObjectMetadataItem } = useDeleteOneObjectMetadataItem();
  const { enqueueToast } = useToast();
  const { openDialog, closeDialog } = useDialog();

  const isDDLLocked = useAtomStateValue(isDDLLockedState);

  const aboutFormConfig = useForm<SettingsDataModelObjectAboutFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(settingsDataModelObjectAboutFormSchema),
    defaultValues: {
      description: objectMetadataItem.description,
      icon: objectMetadataItem.icon ?? undefined,
      isLabelSyncedWithName: objectMetadataItem.isLabelSyncedWithName,
      labelPlural: objectMetadataItem.labelPlural,
      labelSingular: objectMetadataItem.labelSingular,
      namePlural: objectMetadataItem.namePlural,
      nameSingular: objectMetadataItem.nameSingular,
      ...(getIsMetadataItemCustom(objectMetadataItem)
        ? { color: getObjectColorWithFallback(objectMetadataItem) }
        : {}),
    },
  });
  const hasUnsavedAboutEdits = !isEmptyObject(
    aboutFormConfig.formState.dirtyFields,
  );

  const isReadOnly =
    isObjectMetadataReadOnly({ objectMetadataItem }) || isDDLLocked;

  const isValidationRulesEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_VALIDATION_RULES_ENABLED,
  );
  const isRecordLevelSharingEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_RECORD_LEVEL_SHARING_ENABLED,
  );

  const handleDisable = async () => {
    const result = await updateOneObjectMetadataItem({
      idToUpdate: objectMetadataItem.id,
      updatePayload: { isActive: false },
    });

    if (result.status === 'successful') {
      navigate(SettingsPath.Objects);
    }
  };

  const handleDelete = () => {
    openDialog(DELETE_OBJECT_MODAL_ID);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    const result = await deleteOneObjectMetadataItem(objectMetadataItem.id);

    if (result.status === 'successful') {
      enqueueToast({ status: 'success', children: t`Object deleted` });
      closeDialog(DELETE_OBJECT_MODAL_ID);
      navigate(SettingsPath.Objects);
      return;
    }

    setIsDeleting(false);
    closeDialog(DELETE_OBJECT_MODAL_ID);
  };

  const objectLabel = objectMetadataItem.labelPlural;

  return (
    <div {...stylex.props(styles.contentContainer)}>
      <Section.Root {...stylex.props(styles.formSection)}>
        <Section.Header
          title={t`About`}
          description={t`Name in both singular (e.g., 'Invoice') and plural (e.g., 'Invoices') forms.`}
        />
        <SettingsUpdateDataModelObjectAboutForm
          objectMetadataItem={objectMetadataItem}
          formConfig={aboutFormConfig}
        />
      </Section.Root>
      <Section.Root {...stylex.props(styles.formSection)}>
        <Section.Header
          title={t`Options`}
          description={t`Choose the fields that will identify your records`}
        />
        <SettingsDataModelObjectSettingsFormCard
          objectMetadataItem={objectMetadataItem}
        />
      </Section.Root>
      <Section.Root {...stylex.props(styles.formSection)}>
        <Section.Header
          title={t`Translations`}
          description={t`What each language displays for this object's labels`}
        />
        <SettingsTranslationsCard
          objectNamePlural={objectMetadataItem.namePlural}
          disabled={hasUnsavedAboutEdits}
        />
      </Section.Root>
      {isValidationRulesEnabled &&
        !objectMetadataItem.isRemote &&
        !objectMetadataItem.isSystem && (
          <Section.Root {...stylex.props(styles.formSection)}>
            <Section.Header
              title={t`Validation rules`}
              description={t`A record saves only when every active rule is true. Rules run on every write: forms, API, imports and workflows.`}
            />
            <SettingsObjectValidationRulesSection
              objectMetadataItem={objectMetadataItem}
              isReadOnly={isReadOnly}
            />
          </Section.Root>
        )}
      {isRecordLevelSharingEnabled &&
        isShareableObjectMetadataItem(objectMetadataItem) && (
          <Section.Root {...stylex.props(styles.formSection)}>
            <Section.Header
              title={t`Record sharing`}
              description={t`Who a record of ${objectLabel} can be shared with. Roles still decide what people see by default.`}
            />
            <ObjectSharingReachPicker
              objectMetadataItem={objectMetadataItem}
              isReadOnly={isReadOnly}
            />
          </Section.Root>
        )}
      <AdvancedSettingsWrapper>
        <Section.Root {...stylex.props(styles.formSection)}>
          <Section.Header
            title={t`Search`}
            description={t`Configure how this object appears in search results`}
          />
          <SettingsObjectSearchSection
            objectMetadataItem={objectMetadataItem}
            isReadOnly={isReadOnly}
          />
        </Section.Root>
      </AdvancedSettingsWrapper>
      <AdvancedSettingsWrapper>
        <Section.Root {...stylex.props(styles.formSection)}>
          <Section.Header
            title={t`Indexes`}
            description={t`Speed up reads on the fields you filter or sort by most. Each index also slows down writes and uses disk space, so add them with intent.`}
          />
          <SettingsObjectIndexesSection
            objectMetadataItem={objectMetadataItem}
            isReadOnly={isReadOnly}
          />
        </Section.Root>
      </AdvancedSettingsWrapper>
      {!isReadOnly && (
        <Section.Root {...stylex.props(styles.formSection)}>
          <Section.Header
            title={t`Danger zone`}
            description={t`Deactivate object`}
          />
          <div {...stylex.props(styles.dangerButtonsContainer)}>
            <Button
              startIcon={<IconArchive />}
              size="sm"
              onClick={handleDisable}
            >{t`Deactivate`}</Button>
            {getIsMetadataItemCustom(objectMetadataItem) && (
              <Button
                startIcon={<IconTrash />}
                size="sm"
                onClick={handleDelete}
                variant="outline"
                color="danger"
              >{t`Delete`}</Button>
            )}
          </div>
        </Section.Root>
      )}
      <ConfirmationDialog
        dialogId={DELETE_OBJECT_MODAL_ID}
        title={t`Delete ${objectLabel} object?`}
        subtitle={t`This will permanently delete the object and all its records. Type "yes" to confirm.`}
        confirmButtonText={t`Delete`}
        onConfirmClick={confirmDelete}
        onClose={() => closeDialog(DELETE_OBJECT_MODAL_ID)}
        confirmationValue="yes"
        confirmationPlaceholder="yes"
        loading={isDeleting}
      />
    </div>
  );
};

const styles = stylex.create({
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-8'],
  },
  formSection: {
    paddingLeft: 0,
  },
  dangerButtonsContainer: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
});
