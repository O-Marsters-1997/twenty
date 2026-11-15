import * as stylex from '@stylexjs/stylex';
import { useMemo } from 'react';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { SettingsDataModelCardTitle } from '@/settings/data-model/components/SettingsDataModelCardTitle';
import { SettingsDataModelFieldPreviewWidget } from '@/settings/data-model/fields/preview/components/SettingsDataModelFieldPreviewWidget';
import { SettingsDataModelObjectPreview } from '@/settings/data-model/objects/components/SettingsDataModelObjectSummary';
import { SettingsDataModelObjectIdentifiersForm } from '@/settings/data-model/objects/forms/components/SettingsDataModelObjectIdentifiersForm';
import { Trans } from '@lingui/react/macro';
import { Card } from 'twenty-ui/primitives/surfaces';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsDataModelObjectSettingsFormCardProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
};

export const SettingsDataModelObjectSettingsFormCard = ({
  objectMetadataItem,
}: SettingsDataModelObjectSettingsFormCardProps) => {
  const labelIdentifierFieldMetadataItem = useMemo(() => {
    return getLabelIdentifierFieldMetadataItem({
      fields: objectMetadataItem.fields,
      labelIdentifierFieldMetadataId:
        objectMetadataItem.labelIdentifierFieldMetadataId,
    });
  }, [objectMetadataItem]);

  return (
    <Card.Root fullWidth>
      <Card.Content divider {...stylex.props(styles.topCardContent)}>
        <SettingsDataModelCardTitle>
          <Trans>Preview</Trans>
        </SettingsDataModelCardTitle>
        {labelIdentifierFieldMetadataItem ? (
          <SettingsDataModelFieldPreviewWidget
            objectNameSingular={objectMetadataItem.nameSingular}
            fieldMetadataItem={labelIdentifierFieldMetadataItem}
            withFieldLabel={false}
          />
        ) : (
          <div {...stylex.props(styles.objectSummaryCardContainer)}>
            <Card.Root {...stylex.props(styles.objectSummaryCard)}>
              <Card.Content {...stylex.props(styles.objectSummaryCardContent)}>
                <SettingsDataModelObjectPreview
                  objectMetadataItems={[objectMetadataItem]}
                />
              </Card.Content>
            </Card.Root>
          </div>
        )}
      </Card.Content>
      <Card.Content>
        <SettingsDataModelObjectIdentifiersForm
          objectMetadataItem={objectMetadataItem}
        />
      </Card.Content>
    </Card.Root>
  );
};

const styles = stylex.create({
  topCardContent: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
  },
  objectSummaryCardContainer: {
    maxWidth: 480,
  },
  objectSummaryCard: {
    borderRadius: borderRadius['--t-border-radius-md'],
    color: fontColor['--t-font-color-primary'],
  },
  objectSummaryCardContent: {
    padding: spacing['--t-spacing-2'],
  },
});
