import * as stylex from '@stylexjs/stylex';

import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { SettingsDataModelRelationFieldPreview } from '@/settings/data-model/fields/preview/components/SettingsDataModelRelationFieldPreview';
import { SettingsDataModelObjectPreview } from '@/settings/data-model/objects/components/SettingsDataModelObjectSummary';
import { isDefined } from 'twenty-shared/utils';
import { Card } from 'twenty-ui/primitives/surfaces';
import {
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export type SettingsDataModelRelationFieldPreviewSubWidgetProps = {
  fieldMetadataItem: Pick<
    FieldMetadataItem,
    'icon' | 'label' | 'type' | 'settings'
  >;
  objectNameSingulars: string[];
  fieldPreviewTargetObjectNameSingular: string;
  shrink?: boolean;
  withFieldLabel?: boolean;
  pluralizeLabel?: boolean;
};

export const SettingsDataModelRelationFieldPreviewSubWidget = ({
  fieldMetadataItem,
  objectNameSingulars,
  fieldPreviewTargetObjectNameSingular,
  shrink,
  withFieldLabel = true,
  pluralizeLabel = false,
}: SettingsDataModelRelationFieldPreviewSubWidgetProps) => {
  const { objectMetadataItems } = useObjectMetadataItems();

  const targetObjectMetadataItems = objectNameSingulars
    .map((nameSingular) =>
      objectMetadataItems.find((item) => item.nameSingular === nameSingular),
    )
    .filter(isDefined);

  return (
    <div {...stylex.props(styles.container)}>
      <Card.Root fullWidth {...stylex.props(styles.card)}>
        <Card.Content {...stylex.props(styles.cardContent)}>
          <SettingsDataModelObjectPreview
            objectMetadataItems={targetObjectMetadataItems}
            pluralizeLabel={pluralizeLabel}
          />
          <SettingsDataModelRelationFieldPreview
            fieldMetadataItem={fieldMetadataItem}
            relationTargetObjectNameSingular={
              fieldPreviewTargetObjectNameSingular
            }
            shrink={shrink}
            withFieldLabel={withFieldLabel}
          />
        </Card.Content>
      </Card.Root>
    </div>
  );
};

const styles = stylex.create({
  container: {
    display: 'flex',
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  card: {
    borderRadius: borderRadius['--t-border-radius-md'],
    color: fontColor['--t-font-color-primary'],
  },
  cardContent: {
    padding: spacing['--t-spacing-2'],
  },
});
