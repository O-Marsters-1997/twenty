import { useLingui } from '@lingui/react/macro';
import { useId } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { IconArrowUpRight, useIcons } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';

import { EventFieldDiffValue } from '@/activities/timeline-activities/rows/main-object/components/EventFieldDiffValue';
import { EventFieldDiffValueEffect } from '@/activities/timeline-activities/rows/main-object/components/EventFieldDiffValueEffect';
import { EventRelationFieldDiffValues } from '@/activities/timeline-activities/rows/main-object/components/EventRelationFieldDiffValues';
import { StyledLogConsoleFieldsCard } from '@/log-console/components/StyledLogConsoleFieldsCard';
import { LOG_CONSOLE_RECORD_ACTIONS } from '@/log-console/constants/LogConsoleRecordActions';
import { getLogConsoleRecordChangeFieldDiffs } from '@/log-console/utils/getLogConsoleRecordChangeFieldDiffs';
import { isLogConsoleFieldValueEmpty } from '@/log-console/utils/isLogConsoleFieldValueEmpty';
import { objectMetadataItemsByIdMapSelector } from '@/object-metadata/states/objectMetadataItemsByIdMapSelector';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { LogConsoleFieldRow } from '@/log-console/components/LogConsoleFieldRow';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type EventLogRecord } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  recordChange: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  openRecordButton: {
    alignSelf: 'flex-start',
  },
  emptyValue: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

type LogConsoleRecordChangeDetailProps = {
  entry: EventLogRecord;
};

export const LogConsoleRecordChangeDetail = ({
  entry,
}: LogConsoleRecordChangeDetailProps) => {
  const { t } = useLingui();
  const { getIcon } = useIcons();
  const diffId = useId();
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();
  const objectMetadataItemsByIdMap = useAtomStateValue(
    objectMetadataItemsByIdMapSelector,
  );

  const action = LOG_CONSOLE_RECORD_ACTIONS[entry.event];
  const objectMetadataItem = objectMetadataItemsByIdMap.get(
    entry.objectMetadataId ?? '',
  );
  const recordSnapshot = entry.properties?.after ?? entry.properties?.before;

  if (!isDefined(action) || !isDefined(objectMetadataItem)) {
    return null;
  }

  const fieldDiffs = getLogConsoleRecordChangeFieldDiffs({
    entry,
    objectMetadataItem,
  });

  const displayedSnapshot = action.valuesSnapshot ?? 'after';

  const renderFieldValue = ({
    fieldDiff,
    recordStoreId,
  }: {
    fieldDiff: {
      fieldMetadataItem: FieldMetadataItem;
      before?: unknown;
      after?: unknown;
    };
    recordStoreId: string;
  }) => {
    const { fieldMetadataItem } = fieldDiff;
    const value = fieldDiff[displayedSnapshot];

    if (isLogConsoleFieldValueEmpty({ fieldMetadataItem, value })) {
      return <span {...stylex.props(styles.emptyValue)}>{t`Empty`}</span>;
    }

    if (fieldMetadataItem.type === FieldMetadataType.RELATION) {
      return (
        <EventRelationFieldDiffValues
          fieldDiff={
            isDefined(action.valuesSnapshot)
              ? { before: value, after: value }
              : { before: fieldDiff.before, after: fieldDiff.after }
          }
          fieldMetadataItem={fieldMetadataItem}
        />
      );
    }

    return (
      <>
        <EventFieldDiffValueEffect
          diffArtificialRecordStoreId={recordStoreId}
          diffRecord={value as Record<string, unknown>}
          mainObjectMetadataItem={objectMetadataItem}
          fieldMetadataItem={fieldMetadataItem}
        />
        <EventFieldDiffValue
          diffArtificialRecordStoreId={recordStoreId}
          mainObjectMetadataItem={objectMetadataItem}
          fieldMetadataItem={fieldMetadataItem}
        />
      </>
    );
  };

  return (
    <div {...stylex.props(styles.recordChange)}>
      {isDefined(action.valuesTitle) &&
        (isNonEmptyArray(fieldDiffs) || !isDefined(recordSnapshot)) && (
          <Section.Root>
            <Section.Header
              title={t(action.valuesTitle)}
              description={
                isDefined(recordSnapshot)
                  ? undefined
                  : t`Permanently deleted records keep no values.`
              }
            />
            {isNonEmptyArray(fieldDiffs) && (
              <StyledLogConsoleFieldsCard>
                {fieldDiffs.map((fieldDiff) => (
                  <LogConsoleFieldRow
                    key={fieldDiff.key}
                    Icon={getIcon(fieldDiff.fieldMetadataItem.icon)}
                    label={fieldDiff.fieldMetadataItem.label}
                  >
                    <ErrorBoundary fallbackRender={() => null}>
                      {renderFieldValue({
                        fieldDiff,
                        recordStoreId: `${diffId}-${fieldDiff.key}`,
                      })}
                    </ErrorBoundary>
                  </LogConsoleFieldRow>
                ))}
              </StyledLogConsoleFieldsCard>
            )}
          </Section.Root>
        )}
      {isDefined(recordSnapshot) && isDefined(recordSnapshot.id) && (
        <Button
          {...stylex.props(styles.openRecordButton)}
          size="sm"
          startIcon={<IconArrowUpRight />}
          onClick={() =>
            openRecordInSidePanel({
              recordId: recordSnapshot.id,
              objectNameSingular: objectMetadataItem.nameSingular,
            })
          }
        >
          {t`Open record`}
        </Button>
      )}
    </div>
  );
};
