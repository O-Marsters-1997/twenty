import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isHiddenSystemField } from '@/object-metadata/utils/isHiddenSystemField';
import { SettingsObjectRelationsTable } from '@/settings/data-model/object-details/components/SettingsObjectRelationsTable';
import { useLingui } from '@lingui/react/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { Section } from 'twenty-ui/components/layout';
import { SettingsObjectFieldTable } from '@/settings/data-model/object-details/components/SettingsObjectFieldTable';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-8'],
  },
});

type ObjectFieldsProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
};

export const ObjectFields = ({ objectMetadataItem }: ObjectFieldsProps) => {
  const { t } = useLingui();
  const objectLabelSingular = objectMetadataItem.labelSingular;

  const hasRelations = objectMetadataItem.fields.some(
    (field) =>
      !isHiddenSystemField(field) &&
      (field.type === FieldMetadataType.RELATION ||
        field.type === FieldMetadataType.MORPH_RELATION),
  );

  return (
    <div {...stylex.props(styles.contentContainer)}>
      {hasRelations && (
        <Section.Root>
          <Section.Header
            title={t`Relations`}
            description={t`Relation between this object and other objects`}
          />
          <SettingsObjectRelationsTable
            objectMetadataItem={objectMetadataItem}
          />
        </Section.Root>
      )}
      <Section.Root>
        <Section.Header
          title={t`Fields`}
          description={t`Customise the fields available in the ${objectLabelSingular} views and their display order in the ${objectLabelSingular} detail view and menus.`}
        />
        <SettingsObjectFieldTable
          objectMetadataItem={objectMetadataItem}
          mode="view"
          excludeRelations
        />
      </Section.Root>
    </div>
  );
};
