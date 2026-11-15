import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { Handle, Position } from '@xyflow/react';
import { isDefined } from 'twenty-shared/utils';
import { useTheme } from 'twenty-ui/theme';
import { RelationType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type ObjectFieldRowProps = {
  field: FieldMetadataItem;
};

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    position: 'relative',
    width: '100%',
  },
  fieldName: {
    color: fontColor['--t-font-color-primary'],
  },
});

export const ObjectFieldRow = ({ field }: ObjectFieldRowProps) => {
  const theme = useTheme();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);

  const relatedObjectId = field.relation?.targetObjectMetadata.id;

  const relatedObject = objectMetadataItems.find(
    (x) => x.id === relatedObjectId,
  );

  return (
    <div {...stylex.props(styles.row)}>
      {isDefined(relatedObject) && (
        <ObjectMetadataIcon
          objectMetadataItem={relatedObject}
          size={theme.icon.size.md}
        />
      )}
      <div {...stylex.props(styles.fieldName)}>
        {relatedObject?.labelPlural ?? ''}
      </div>
      <Handle
        type={
          field.relation?.type === RelationType.ONE_TO_MANY
            ? 'source'
            : 'target'
        }
        position={Position.Right}
        id={`${field.id}-right`}
        className={
          field.relation?.type === RelationType.ONE_TO_MANY
            ? 'right-handle source-handle'
            : 'right-handle target-handle'
        }
      />
      <Handle
        type={
          field.relation?.type === RelationType.ONE_TO_MANY
            ? 'source'
            : 'target'
        }
        position={Position.Left}
        id={`${field.id}-left`}
        className={
          field.relation?.type === RelationType.ONE_TO_MANY
            ? 'left-handle source-handle'
            : 'left-handle target-handle'
        }
      />
    </div>
  );
};
