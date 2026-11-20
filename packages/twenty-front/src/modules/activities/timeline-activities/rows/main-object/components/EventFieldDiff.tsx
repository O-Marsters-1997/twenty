import { EventFieldDiffLabel } from '@/activities/timeline-activities/rows/main-object/components/EventFieldDiffLabel';
import { EventFieldDiffValue } from '@/activities/timeline-activities/rows/main-object/components/EventFieldDiffValue';
import { EventFieldDiffValueEffect } from '@/activities/timeline-activities/rows/main-object/components/EventFieldDiffValueEffect';
import { EventRelationFieldDiffValues } from '@/activities/timeline-activities/rows/main-object/components/EventRelationFieldDiffValues';
import { isRelationFieldChangeValue } from '@/activities/timeline-activities/utils/relationFieldChangeValue';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { Trans } from '@lingui/react/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type EventFieldDiffProps = {
  fieldDiff: { before: unknown; after: unknown };
  mainObjectMetadataItem: EnrichedObjectMetadataItem;
  fieldMetadataItem: FieldMetadataItem | undefined;
  diffArtificialRecordStoreId: string;
};

const styles = stylex.create({
  eventFieldDiffContainer: {
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    height: '24px',
    maxWidth: '100%',
  },
  emptyValue: {
    color: fontColor['--t-font-color-tertiary'],
  },
  arrowContainer: {
    color: fontColor['--t-font-color-secondary'],
  },
});

export const EventFieldDiff = ({
  fieldDiff,
  mainObjectMetadataItem,
  fieldMetadataItem,
  diffArtificialRecordStoreId,
}: EventFieldDiffProps) => {
  if (!fieldMetadataItem) {
    throw new Error('fieldMetadataItem is required');
  }

  const isRelationFieldDiff =
    fieldMetadataItem.type === FieldMetadataType.RELATION &&
    (isRelationFieldChangeValue(fieldDiff.before) ||
      isRelationFieldChangeValue(fieldDiff.after));

  if (isRelationFieldDiff) {
    return (
      <div {...stylex.props(styles.eventFieldDiffContainer)}>
        <EventFieldDiffLabel fieldMetadataItem={fieldMetadataItem} />
        <span {...stylex.props(styles.arrowContainer)}>→</span>
        <EventRelationFieldDiffValues
          fieldDiff={fieldDiff}
          fieldMetadataItem={fieldMetadataItem}
        />
      </div>
    );
  }

  const diffRecord = fieldDiff.after as Record<string, unknown> | undefined;

  const isValueEmpty = (value: unknown): boolean =>
    value === null || value === undefined || value === '';

  const isObjectEmpty = (objectValue: Record<string, unknown>): boolean =>
    Object.values(objectValue).every(isValueEmpty);

  const isUpdatedToEmpty =
    isValueEmpty(diffRecord) ||
    (typeof diffRecord === 'object' &&
      diffRecord !== null &&
      isObjectEmpty(diffRecord));

  return (
    <div {...stylex.props(styles.eventFieldDiffContainer)}>
      <EventFieldDiffLabel fieldMetadataItem={fieldMetadataItem} />
      <span {...stylex.props(styles.arrowContainer)}>→</span>
      {isUpdatedToEmpty ? (
        <div {...stylex.props(styles.emptyValue)}>
          <Trans>Empty</Trans>
        </div>
      ) : (
        <>
          <EventFieldDiffValueEffect
            diffArtificialRecordStoreId={diffArtificialRecordStoreId}
            mainObjectMetadataItem={mainObjectMetadataItem}
            fieldMetadataItem={fieldMetadataItem}
            diffRecord={diffRecord}
          />
          <EventFieldDiffValue
            diffArtificialRecordStoreId={diffArtificialRecordStoreId}
            mainObjectMetadataItem={mainObjectMetadataItem}
            fieldMetadataItem={fieldMetadataItem}
          />
        </>
      )}
    </div>
  );
};
