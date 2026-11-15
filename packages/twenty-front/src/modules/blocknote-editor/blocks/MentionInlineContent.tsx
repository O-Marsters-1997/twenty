import { MentionRecordChip } from '@/mention/components/MentionRecordChip';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { RecordChip } from '@/object-record/components/RecordChip';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { createReactInlineContentSpec } from '@blocknote/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { Chip } from 'twenty-ui/primitives/data-display';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  recordChipContainer: {
    display: 'inline',
    height: 'auto',
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
  inlineMentionRecordChipContainer: {
    display: 'inline',
    height: 'auto',
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
});

const LegacyMentionRenderer = ({
  recordId,
  objectMetadataId,
}: {
  recordId: string;
  objectMetadataId: string;
}) => {
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);

  const objectMetadataItem = objectMetadataItems.find(
    (item) => item.id === objectMetadataId,
  );

  const objectNameSingular = objectMetadataItem?.nameSingular;

  const { record, loading } = useFindOneRecord({
    objectNameSingular: objectNameSingular ?? '',
    objectRecordId: recordId,
    skip: !isNonEmptyString(objectNameSingular) || !isNonEmptyString(recordId),
  });

  if (loading) {
    return null;
  }

  if (!isDefined(objectMetadataItem)) {
    return (
      <Chip
        variant="ghost"
        aria-disabled
        style={{ paddingInlineStart: 0 }}
      >{t`Unknown object`}</Chip>
    );
  }

  if (!isDefined(record)) {
    return (
      <Chip
        variant="ghost"
        aria-disabled
        style={{ paddingInlineStart: 0 }}
      >{t`Deleted record`}</Chip>
    );
  }

  return (
    <div {...stylex.props(styles.recordChipContainer)}>
      <RecordChip
        objectNameSingular={objectMetadataItem.nameSingular}
        record={record}
        forceDisableClick={false}
      />
    </div>
  );
};

export const MentionInlineContent = createReactInlineContentSpec(
  {
    type: 'mention' as const,
    propSchema: {
      recordId: {
        default: '' as const,
      },
      objectMetadataId: {
        default: '' as const,
      },
      objectNameSingular: {
        default: '' as const,
      },
      label: {
        default: '' as const,
      },
      imageUrl: {
        default: '' as const,
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const {
        recordId,
        objectMetadataId,
        objectNameSingular,
        label,
        imageUrl,
      } = props.inlineContent.props;

      // New notes store objectNameSingular + label + imageUrl directly
      if (isNonEmptyString(objectNameSingular) && isNonEmptyString(label)) {
        return (
          <div {...stylex.props(styles.inlineMentionRecordChipContainer)}>
            <MentionRecordChip
              recordId={recordId}
              objectNameSingular={objectNameSingular}
              label={label}
              imageUrl={imageUrl}
            />
          </div>
        );
      }

      // Legacy notes only have objectMetadataId + recordId: fetch data
      return (
        <LegacyMentionRenderer
          recordId={recordId}
          objectMetadataId={objectMetadataId}
        />
      );
    },
  },
);
